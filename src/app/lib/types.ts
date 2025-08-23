import { Enrollment, Kudos, Location, User } from "@generated/prisma";

export type EnrollmentWithUser = Enrollment & { user: User };

export type EnrollmentWithUserLocation = EnrollmentWithUser & { currentLocation: Location | null }

export type KudosWithUser = Kudos & { user: Pick<User, "firstName" | "lastName"> };

export type Name = {
  firstName: string,
  lastName: string,
  fullName: string,
}