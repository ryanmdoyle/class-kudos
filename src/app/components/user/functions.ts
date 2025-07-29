"use server";

export async function addTeacherEmail(formData: FormData) {
  console.log(formData)
  try {
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    return { success: true, error: null };
  } catch (error) {
    console.error(error);
    return { success: false, error: error as Error };
  }

  // const { request, headers } = requestInfo;
  // const session = await sessions.load(request);

  // if (!session?.userId) {
  //   return false;
  // }

  // const user = await db.user.findUnique({
  //   where: {
  //     id: session.userId,
  //   },
  // });

  // if (!user || user.role !== "TEACHER") {
  //   return false;
  // }

  // const formData = await request.formData();
  // const email = formData.get("email") as string;

  // if (!email || !email.includes("@")) {
  //   return false;
  // }

  // await db.user.update({
  //   where: { id: user.id },
  //   data: { email },
  // });
}