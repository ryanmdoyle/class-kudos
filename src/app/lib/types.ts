import { Enrollment, User } from "@generated/prisma";

export type EnrollmentWithUser = Enrollment & { user: User };
