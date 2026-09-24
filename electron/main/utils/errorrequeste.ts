export const catchError = (error: any) => {
  console.error(error);
  return { message: "Somethin rwong", success: false };
};
