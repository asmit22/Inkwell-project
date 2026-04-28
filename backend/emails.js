// backend/emails.js
// ─────────────────────────────────────────────────────────
//  Email templates for story notifications.
//  Integrate with SendGrid, Resend, or your email service.
// ─────────────────────────────────────────────────────────

/**
 * Email sent to writer when story is approved
 */
function storyApprovedEmail(writerEmail, storyTitle) {
  return {
    to: writerEmail,
    subject: `🎉 Your story "${storyTitle}" has been approved!`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1209; font-size: 28px;">Congratulations! 🎉</h1>
        <p style="color: #7a6e5f; font-size: 16px; line-height: 1.6;">
          Your story <strong>"${storyTitle}"</strong> has passed editorial review and is now live on Inkwell.
        </p>
        <p style="color: #7a6e5f; font-size: 16px; line-height: 1.6;">
          Readers can now discover and enjoy your work. Track engagement and feedback in your author dashboard.
        </p>
        <div style="margin: 32px 0;">
          <a href="${process.env.APP_URL}/publish" style="
            display: inline-block;
            background: #1a1209;
            color: #f5f0e8;
            padding: 12px 32px;
            text-decoration: none;
            font-weight: bold;
            border-radius: 2px;
          ">View Your Story</a>
        </div>
        <p style="color: #7a6e5f; font-size: 14px;">
          Thank you for sharing your story with our community.
          <br><br>
          — The Inkwell Team
        </p>
      </div>
    `,
  };
}

/**
 * Email sent to writer when story is rejected
 */
function storyRejectedEmail(writerEmail, storyTitle, reviewNote) {
  return {
    to: writerEmail,
    subject: `Your story "${storyTitle}" needs revision`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1209; font-size: 28px;">Revision Requested</h1>
        <p style="color: #7a6e5f; font-size: 16px; line-height: 1.6;">
          Thank you for submitting <strong>"${storyTitle}"</strong> to Inkwell.
        </p>
        <p style="color: #7a6e5f; font-size: 16px; line-height: 1.6;">
          Our editorial team has reviewed your work and would like to suggest some revisions:
        </p>
        <div style="background: #fdf0ef; border-left: 4px solid #c0392b; padding: 16px; margin: 20px 0;">
          <p style="color: #7a6e5f; margin: 0;">${reviewNote || 'Please review the submission guidelines and try again.'}</p>
        </div>
        <p style="color: #7a6e5f; font-size: 16px; line-height: 1.6;">
          We encourage you to address the feedback and resubmit. Your voice matters, and we'd love to see your revised work.
        </p>
        <div style="margin: 32px 0;">
          <a href="${process.env.APP_URL}/publish" style="
            display: inline-block;
            background: #1a1209;
            color: #f5f0e8;
            padding: 12px 32px;
            text-decoration: none;
            font-weight: bold;
            border-radius: 2px;
          ">Resubmit</a>
        </div>
        <p style="color: #7a6e5f; font-size: 14px;">
          Have questions? Contact our editorial team at <a href="mailto:editorial@inkwell.local" style="color: #c8832a;">editorial@inkwell.local</a>
          <br><br>
          — The Inkwell Team
        </p>
      </div>
    `,
  };
}

/**
 * Email sent to admin when new story is submitted
 */
function newStorySubmittedEmail(adminEmail, storyTitle, writerEmail) {
  return {
    to: adminEmail,
    subject: `📝 New story submitted: "${storyTitle}"`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1209;">New Submission</h1>
        <p style="color: #7a6e5f;">
          <strong>"${storyTitle}"</strong> has been submitted by <code>${writerEmail}</code>
        </p>
        <div style="margin: 32px 0;">
          <a href="${process.env.APP_URL}/admin/dashboard" style="
            display: inline-block;
            background: #c8832a;
            color: white;
            padding: 12px 32px;
            text-decoration: none;
            font-weight: bold;
            border-radius: 2px;
          ">Review Now</a>
        </div>
      </div>
    `,
  };
}

module.exports = {
  storyApprovedEmail,
  storyRejectedEmail,
  newStorySubmittedEmail,
};
