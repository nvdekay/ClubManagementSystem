// Cast of the defense demo seeds (seed-defense-p*.ts). Each role defaults to a data-only demo
// account and can be pointed at a real Google account so the presenter can log in as that role:
//   npm run seed:defense:p4 -- --leader=a@x --officer=b@y --member=c@z
// An overridden account must already exist (it has logged in once); its name is left untouched.
const defaults = {
  leader: { email: "an.demo@fpt.edu.vn", name: "Nguyễn Minh An" },
  vice: { email: "bao.demo@fpt.edu.vn", name: "Trần Gia Bảo" },
  member: { email: "chi.demo@fpt.edu.vn", name: "Lê Ngọc Chi" },
  member2: { email: "duy.demo@fpt.edu.vn", name: "Phạm Hoàng Duy" },
  officer: { email: "officer.demo@fpt.edu.vn", name: "Cán bộ ICPDP" },
};

export type CastRole = keyof typeof defaults;
export type CastMember = { email: string; name: string; overridden: boolean };

export const DEMO_CLUB_NAME = "CLB Sáng tạo Công nghệ FPTU";

// Đọc cast (email các vai demo) từ tham số dòng lệnh, có giá trị mặc định
export function defenseCast(argv: string[] = process.argv.slice(2)): Record<CastRole, CastMember> {
  const cast = {} as Record<CastRole, CastMember>;
  for (const role of Object.keys(defaults) as CastRole[]) {
    const email = argv.find((arg) => arg.startsWith(`--${role}=`))?.slice(role.length + 3).trim().toLowerCase();
    cast[role] = email ? { email, name: defaults[role].name, overridden: true } : { ...defaults[role], overridden: false };
  }
  return cast;
}
