export interface ClubChannel {
  label: string;
  url: string;
}

export interface ClubProfile {
  id: string;
  code: string;
  name: string;
  field: string;
  state: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  charterUrl?: string;
  channels: ClubChannel[];
  operatingScope?: string;
  institutionalFields?: unknown;
  updatedAt?: Date;
}

export interface ClubProfileInput {
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  charterUrl?: string;
  channels: ClubChannel[];
  operatingScope?: string;
}

export interface ClubDepartment {
  id: string;
  clubId: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ClubDepartmentInput {
  name: string;
  description?: string;
  sortOrder: number;
}

export interface ClubProfileRepository {
  findProfile(clubId: string): Promise<ClubProfile | null>;
  listDepartments(clubId: string): Promise<ClubDepartment[]>;
  updateProfile(clubId: string, actorId: string, input: ClubProfileInput,
    now: Date): Promise<ClubProfile>;
  applyDepartmentTemplate(clubId: string, actorId: string,
    template: readonly ClubDepartmentInput[], now: Date): Promise<ClubDepartment[]>;
  createDepartment(clubId: string, actorId: string, input: ClubDepartmentInput,
    now: Date): Promise<ClubDepartment>;
  updateDepartment(clubId: string, departmentId: string, actorId: string,
    input: ClubDepartmentInput, now: Date): Promise<ClubDepartment>;
  deactivateDepartment(clubId: string, departmentId: string, actorId: string,
    now: Date): Promise<ClubDepartment>;
}
