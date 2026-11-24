import { z } from 'zod'

// Nơi DUY NHẤT được đọc process.env (được scripts/check-constitution.sh kiểm tra).
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  ALLOWED_DOMAIN: z.string().optional(),
  BOOTSTRAP_ICPDP_EMAIL: z.string().optional(),
  APP_BASE_URL: z.string().optional(),
  CLIENT_BASE_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  MAIL_TRANSPORT: z.enum(['log', 'smtp']).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().optional(),
})

const authSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  ALLOWED_DOMAIN: z.string().min(1),
  BOOTSTRAP_ICPDP_EMAIL: z.string().email(),
  APP_BASE_URL: z.string().url(),
  CLIENT_BASE_URL: z.string().url(),
})

export type Config = z.infer<typeof schema>
export type AuthConfig = z.infer<typeof authSchema>

const cloudinarySchema = z.object({
  CLOUDINARY_CLOUD_NAME: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
})
export type CloudinaryConfig = z.infer<typeof cloudinarySchema>

// Đọc cấu hình Cloudinary, trả null nếu chưa cấu hình, lỗi nếu cấu hình thiếu
export function optionalCloudinaryConfig(config: Config): CloudinaryConfig | null {
  const values = [
    config.CLOUDINARY_CLOUD_NAME,
    config.CLOUDINARY_API_KEY,
    config.CLOUDINARY_API_SECRET,
  ]
  if (values.every((value) => !value)) {
    return null
  }
  const parsed = cloudinarySchema.safeParse(config)
  if (!parsed.success) {
    throw new Error(
      `Cloudinary configuration missing or invalid: ${Object.keys(parsed.error.flatten().fieldErrors).join(', ')}`,
    )
  }
  return parsed.data
}

// Dạng "Name <address>" hoặc chỉ địa chỉ; phần địa chỉ mới là phần phải hợp lệ.
const mailFrom = z
  .string()
  .trim()
  .refine((value) => {
    const address = /<([^<>]+)>$/.exec(value)?.[1] ?? value
    return z.string().email().safeParse(address).success && !/[\r\n]/.test(value)
  }, 'MAIL_FROM must be an email address or Name <address>')

const smtpSchema = z.object({
  SMTP_HOST: z.string().trim().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  // true = TLS ngay từ byte đầu (cổng 465); false = nâng cấp STARTTLS (cổng 587), Google yêu cầu kiểu này.
  SMTP_SECURE: z.enum(['true', 'false']).transform((value) => value === 'true'),
  SMTP_USER: z.string().trim().min(1),
  SMTP_PASSWORD: z.string().min(1),
  MAIL_FROM: mailFrom,
})
export type SmtpConfig = z.infer<typeof smtpSchema>
export type MailConfig = { transport: 'log' } | ({ transport: 'smtp' } & SmtpConfig)

// Chọn transport email (log hoặc SMTP) và kiểm cấu hình hợp lệ
/**
 * EXT-02: chọn transport email và báo lỗi sớm. Production bắt buộc gửi qua SMTP; cấu hình SMTP
 * thiếu thì không bao giờ âm thầm chuyển sang log transport. Thông báo lỗi chỉ nêu tên key, không nêu giá trị.
 */
export function mailConfig(config: Config): MailConfig {
  const smtpKeys = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'MAIL_FROM',
  ] as const
  const anySmtp = smtpKeys.some((key) => Boolean(config[key]))
  const transport =
    config.MAIL_TRANSPORT ?? (config.NODE_ENV === 'production' || anySmtp ? 'smtp' : 'log')
  if (transport === 'log') {
    if (config.NODE_ENV === 'production') {
      throw new Error('MAIL_TRANSPORT=log is not allowed in production')
    }
    if (anySmtp) {
      throw new Error('SMTP settings are present but MAIL_TRANSPORT=log; remove them or use smtp')
    }
    return { transport: 'log' }
  }
  const parsed = smtpSchema.safeParse(config)
  if (!parsed.success) {
    throw new Error(
      `SMTP configuration missing or invalid: ${Object.keys(parsed.error.flatten().fieldErrors).join(', ')}`,
    )
  }
  return { transport: 'smtp', ...parsed.data }
}

// Bắt buộc có đủ cấu hình đăng nhập Google và phiên, thiếu thì báo lỗi
export function requireAuthConfig(config: Config): AuthConfig {
  const parsed = authSchema.safeParse(config)
  if (!parsed.success) {
    throw new Error(
      `Auth configuration missing or invalid: ${Object.keys(parsed.error.flatten().fieldErrors).join(', ')}`,
    )
  }
  return parsed.data
}

// Trả cấu hình Auth nếu có khai báo, chưa khai báo thì trả null
export function optionalAuthConfig(config: Config): AuthConfig | null {
  const hasAuthSetting = [
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.SESSION_SECRET,
    config.ALLOWED_DOMAIN,
    config.BOOTSTRAP_ICPDP_EMAIL,
  ].some((value) => Boolean(value))
  return hasAuthSetting ? requireAuthConfig(config) : null
}

// Đọc và kiểm tra biến môi trường, sai thì dừng tiến trình ngay
export function loadConfig(): Config {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    console.error('❌ Invalid environment:', parsed.error.flatten().fieldErrors)
    process.exit(1) // dừng ngay — không bao giờ khởi động với cấu hình hỏng
  }
  return parsed.data
}
