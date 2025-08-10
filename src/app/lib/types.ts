import { Enrollment, Kudos, User } from "@generated/prisma";

export type EnrollmentWithUser = Enrollment & { user: User };

export type KudosWithUser = Kudos & { user: Pick<User, "firstName" | "lastName"> };