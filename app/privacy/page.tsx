import React from "react"
import { ChevronLeftIcon } from "lucide-react"
import Link from "next/link"

export default function PrivacyPolicyPage() {
  const appName = "Auth0 AI Demo"
  const effectiveDate = "June 4, 2025"
  const contactEmail = "mike.wallick@okta.com"

  return (
    <>
      <div className="flex items-center space-x-1 text-sm">
        <ChevronLeftIcon className="h-4 w-4" />
        <Link href="/" className="font-light">
          Back to chat
        </Link>
      </div>
      <div
        className="privacy-policy-container"
        style={{
          fontFamily: "sans-serif",
          lineHeight: 1.6,
          margin: "0 auto",
          maxWidth: "800px",
          padding: "20px",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "30px" }}>Privacy Policy for {appName}</h1>

        <p style={{ fontStyle: "italic" }}>
          <strong>Effective Date:</strong> {effectiveDate}
        </p>

        <p>
          Welcome to {appName} (the &quot;App&quot;, &quot;Service&quot;, &quot;we&quot;,
          &quot;us&quot;, or &quot;our&quot;). This Privacy Policy explains how we collect, use, and
          disclose information about you when you use our demo application.
        </p>

        <p>
          This App is a demonstration of an AI chatbot&apos;s capabilities. Your privacy is
          important to us.
        </p>

        <h2
          style={{
            borderBottom: "1px solid #eee",
            paddingBottom: "5px",
            marginTop: "30px",
          }}
        >
          1. Information We Collect
        </h2>
        <p>We collect a limited amount of information to provide you with our Service:</p>
        <ul style={{ marginLeft: "20px" }}>
          <li style={{ marginBottom: "8px" }}>
            <strong>Information You Provide Directly:</strong>
            <ul style={{ marginLeft: "20px", marginTop: "5px" }}>
              <li>
                <strong>Email Address:</strong> If you choose to create an account or log in using
                your email address, we will collect your email address.
              </li>
            </ul>
          </li>
          <li style={{ marginBottom: "8px" }}>
            <strong>Information from Social Logins:</strong>
            <ul style={{ marginLeft: "20px", marginTop: "5px" }}>
              <li>
                If you choose to log in using a third-party social identity provider (like Google or
                Microsoft), we will request your consent to access basic profile information from
                that provider. This information is typically limited to:
                <ul style={{ marginLeft: "20px", marginTop: "5px" }}>
                  <li>Your Name (as provided by the social provider)</li>
                  <li>Your Email Address (as provided by the social provider)</li>
                </ul>
              </li>
              <li>
                We only receive information that you have explicitly authorized the social provider
                to share with us. We do not collect passwords from your social media accounts.
              </li>
            </ul>
          </li>
          <li style={{ marginBottom: "8px" }}>
            <strong>Information Collected Automatically:</strong>
            <p>
              Currently, our demo application does not intentionally collect additional personal
              information automatically (like IP addresses or detailed usage analytics that are tied
              to your personal identity). We aim to keep data collection minimal for this
              demonstration.{" "}
            </p>
          </li>
        </ul>

        <h2
          style={{
            borderBottom: "1px solid #eee",
            paddingBottom: "5px",
            marginTop: "30px",
          }}
        >
          2. How We Use Your Information
        </h2>
        <p>We use the information we collect for the following limited purposes:</p>
        <ul style={{ marginLeft: "20px" }}>
          <li style={{ marginBottom: "8px" }}>
            <strong>To Provide and Operate the Service:</strong> To allow you to access and use the
            AI chatbot demo.
          </li>
          <li style={{ marginBottom: "8px" }}>
            <strong>To Authenticate You:</strong> To verify your identity when you log in, either
            via email or a social provider.
          </li>
          <li style={{ marginBottom: "8px" }}>
            <strong>To Personalize Your Experience (Minimally):</strong> We may use your name (if
            provided by a social login) to address you within the application.
          </li>
          <li style={{ marginBottom: "8px" }}>
            <strong>For Demonstration Purposes:</strong> The primary use of any data within the
            chatbot interactions is to demonstrate the AI&apos;s capabilities. We do not use this
            interaction data for purposes beyond the immediate functionality of the demo unless
            explicitly stated. Conversations are stored for up to 24 hours and are automatically
            deleted at 05:00 UTC every day.
          </li>
        </ul>

        <h2
          style={{
            borderBottom: "1px solid #eee",
            paddingBottom: "5px",
            marginTop: "30px",
          }}
        >
          3. How We Share Your Information
        </h2>
        <p>
          We do not sell your personal information. We limit sharing of your information to the
          following:
        </p>
        <ul style={{ marginLeft: "20px" }}>
          <li style={{ marginBottom: "8px" }}>
            <strong>Social Login Providers:</strong> If you log in using a social provider, you are
            sharing information with that provider according to their own privacy policies. We only
            receive the basic profile information you consent to share.
          </li>
          <li style={{ marginBottom: "8px" }}>
            <strong>Service Providers:</strong> We may use third-party service providers for hosting
            and other essential operational functions. These providers are obligated to protect your
            information.
          </li>
          <li style={{ marginBottom: "8px" }}>
            <strong>Legal Requirements:</strong> We may disclose your information if required to do
            so by law or in the good faith belief that such action is necessary to comply with a
            legal obligation, protect and defend our rights or property, prevent fraud, act in
            urgent circumstances to protect the personal safety of users of the Service, or protect
            against legal liability.
          </li>
        </ul>

        <h2
          style={{
            borderBottom: "1px solid #eee",
            paddingBottom: "5px",
            marginTop: "30px",
          }}
        >
          4. Data Security
        </h2>
        <p>
          We take reasonable measures to help protect information about you from loss, theft,
          misuse, and unauthorized access, disclosure, alteration, and destruction. However, no
          internet or email transmission is ever fully secure or error-free, so you should take
          special care in deciding what information you send to us.
        </p>

        <h2
          style={{
            borderBottom: "1px solid #eee",
            paddingBottom: "5px",
            marginTop: "30px",
          }}
        >
          5. Data Retention
        </h2>
        <ul style={{ marginLeft: "20px" }}>
          <li style={{ marginBottom: "8px" }}>
            <strong>Account Information:</strong> We retain the information associated with your
            account (name and email from social login, or just email for direct signup) for as long
            as your account is active with our demo service or as needed to provide you services.
          </li>
          <li style={{ marginBottom: "8px" }}>
            <strong>Demo Data:</strong> As this is a demo application, data generated or processed
            during your use may be ephemeral or periodically purged. Conversations are stored for up
            to 24 hours and are automatically deleted at 05:00 UTC every day.
          </li>
        </ul>

        <h2
          style={{
            borderBottom: "1px solid #eee",
            paddingBottom: "5px",
            marginTop: "30px",
          }}
        >
          6. Your Data Rights and Choices
        </h2>
        <ul style={{ marginLeft: "20px" }}>
          <li style={{ marginBottom: "8px" }}>
            <strong>Social Logins:</strong> You can manage the information we receive from social
            providers through your privacy settings on the respective social media platforms. You
            can also typically disconnect our App via the settings on those platforms.
          </li>
          <li style={{ marginBottom: "8px" }}>
            <strong>Access and Deletion:</strong> If you wish to access, correct, or request
            deletion of the personal information we hold about you (primarily your name and email),
            please contact us at the email address provided below. We will respond to your request
            within a reasonable timeframe.
          </li>
        </ul>

        <h2
          style={{
            borderBottom: "1px solid #eee",
            paddingBottom: "5px",
            marginTop: "30px",
          }}
        >
          7. Children&apos;s Privacy
        </h2>
        <p>
          Our Service is not directed to individuals under the age of 18. We do not knowingly
          collect personal information from individuals under 18. If we become aware that an
          individual under 18 has provided us with personal information, we will take steps to
          delete such information.
        </p>

        <h2
          style={{
            borderBottom: "1px solid #eee",
            paddingBottom: "5px",
            marginTop: "30px",
          }}
        >
          8. Changes to This Privacy Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. If we make changes, we will notify
          you by revising the &quot;Effective Date&quot; at the top of this policy and, in some
          cases, we may provide you with additional notice (such as by adding a statement to our
          homepage or sending you a notification). We encourage you to review the Privacy Policy
          whenever you access the Service to stay informed about our information practices and the
          choices available to you.
        </p>

        <h2
          style={{
            borderBottom: "1px solid #eee",
            paddingBottom: "5px",
            marginTop: "30px",
          }}
        >
          9. Contact Us
        </h2>
        <p className="contact-info">
          If you have any questions about this Privacy Policy, please contact us at:
          <a href={`mailto:${contactEmail}`} style={{ color: "#007bff" }}>
            {" "}
            {contactEmail}
          </a>
        </p>
      </div>
      <div className="flex items-center space-x-1 text-sm">
        <ChevronLeftIcon className="h-4 w-4" />
        <Link href="/" className="font-light">
          Back to chat
        </Link>
      </div>
    </>
  )
}
