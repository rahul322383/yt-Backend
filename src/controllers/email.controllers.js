import asyncHandler from "../utils/asyncHandler.js";
import sendEmail from "../utils/SendEmail.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

export const sendTestEmail = asyncHandler(async (req, res) => {
  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    throw new ApiError(400, "Missing required fields");
  }

  await sendEmail({
    to,
    subject,
    html: `<p>${message}</p>`,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Email sent successfully"));
});
