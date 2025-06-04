import React from "react"

export default function TermsOfServicePage() {
  const appName = "Auth0 AI Demo"
  const yourNameOrCompany = "Us"
  const effectiveDate = "June 4, 2025"
  const noticePeriod = "30"
  const governingLawLocation = "the United States"
  const contactEmail = "mike.wallick@okta.com"

  return (
    <div
      className="terms-of-service-container"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        lineHeight: 1.6,
        margin: "0 auto",
        maxWidth: "800px",
        padding: "20px",
        color: "#333",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "30px", fontSize: "1.8em", color: "#111" }}>
        Terms of Service for {appName}
      </h1>
      <p
        className="effective-date"
        style={{ textAlign: "center", marginBottom: "20px", fontStyle: "italic", color: "#555" }}
      >
        <strong>Effective Date:</strong> {effectiveDate}
      </p>

      <h2
        style={{
          borderBottom: "1px solid #eee",
          paddingBottom: "6px",
          marginTop: "35px",
          fontSize: "1.4em",
          color: "#111",
        }}
      >
        1. Acceptance of Terms
      </h2>
      <p>
        By accessing or using {appName} (the &quot;Service&quot;), provided by {yourNameOrCompany},
        you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with
        any part of the terms, then you may not access the Service.
      </p>

      <h2
        style={{
          borderBottom: "1px solid #eee",
          paddingBottom: "6px",
          marginTop: "35px",
          fontSize: "1.4em",
          color: "#111",
        }}
      >
        2. Description of Service
      </h2>
      <p>
        The Service is an AI-powered chatbot demonstration provided for evaluation, testing, and
        demonstration purposes only. The features, capabilities, and availability of the Service may
        change or be limited without notice as it is a demonstration application.
      </p>

      <h2
        style={{
          borderBottom: "1px solid #eee",
          paddingBottom: "6px",
          marginTop: "35px",
          fontSize: "1.4em",
          color: "#111",
        }}
      >
        3. User Accounts
      </h2>
      <p>
        To access the Service, you may need to log in using a third-party authentication service
        (e.g., Google, Microsoft) or by providing an email address. You are responsible for any
        activity that occurs through your account and agree to keep your login credentials secure.
        If you are using a third-party service, your use of that service is also governed by their
        terms and privacy policies.
      </p>

      <h2
        style={{
          borderBottom: "1px solid #eee",
          paddingBottom: "6px",
          marginTop: "35px",
          fontSize: "1.4em",
          color: "#111",
        }}
      >
        4. Intended Use and Prohibited Conduct
      </h2>
      <p>
        You agree to use the Service solely for its intended demonstration purposes and in
        compliance with all applicable laws and regulations. You agree not to:
      </p>
      <ul style={{ marginLeft: "20px", paddingLeft: 0 }}>
        <li style={{ marginBottom: "8px" }}>
          Rely on the Service or its output for any critical decisions, including but not limited to
          medical, legal, financial, or safety-critical applications. The AI responses are for
          informational and demonstration purposes only and may contain inaccuracies, errors, or
          omissions.
        </li>
        <li style={{ marginBottom: "8px" }}>
          Use the Service for any illegal, harmful, fraudulent, infringing, or offensive purposes.
        </li>
        <li style={{ marginBottom: "8px" }}>
          Input sensitive personal information (e.g., social security numbers, credit card details,
          health information) into the chatbot.
        </li>
        <li style={{ marginBottom: "8px" }}>
          Attempt to gain unauthorized access to, interfere with, damage, or disrupt any parts of
          the Service, its servers, or any connected network.
        </li>
        <li style={{ marginBottom: "8px" }}>
          Use the Service to generate or disseminate spam, abusive content, or content that violates
          the rights of others.
        </li>
        <li style={{ marginBottom: "8px" }}>
          Reverse engineer, decompile, disassemble, or otherwise attempt to discover the source code
          or underlying ideas or algorithms of the Service.
        </li>
      </ul>
      <p>
        You are solely responsible for any text, queries, or information you input into the Service
        (&quot;Input&quot;) and for any consequences arising from your use of the Service or its
        output.
      </p>

      <h2
        style={{
          borderBottom: "1px solid #eee",
          paddingBottom: "6px",
          marginTop: "35px",
          fontSize: "1.4em",
          color: "#111",
        }}
      >
        5. Intellectual Property
      </h2>
      <p>
        The Service and its original content (excluding Input provided by users), features, and
        functionality are and will remain the exclusive property of {yourNameOrCompany} and its
        licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks
        and trade dress may not be used in connection with any product or service without our prior
        written consent.
      </p>

      <h2
        style={{
          borderBottom: "1px solid #eee",
          paddingBottom: "6px",
          marginTop: "35px",
          fontSize: "1.4em",
          color: "#111",
        }}
      >
        6. Your Input
      </h2>
      <p>
        You are responsible for any Input you provide to the Service. Do not submit any confidential
        or proprietary information. By using the Service, you understand that your Input will be
        processed by the AI to generate responses. Please refer to our Privacy Policy for more
        information on how we handle data, including Input.
      </p>

      <h2
        style={{
          borderBottom: "1px solid #eee",
          paddingBottom: "6px",
          marginTop: "35px",
          fontSize: "1.4em",
          color: "#111",
        }}
      >
        7. Disclaimers
      </h2>
      <p>
        THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS, WITHOUT
        ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO,
        IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR
        NON-INFRINGEMENT.
      </p>
      <p>
        WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE, NOR DO WE
        MAKE ANY WARRANTY AS TO THE ACCURACY, COMPLETENESS, RELIABILITY, OR SUITABILITY OF THE
        INFORMATION OR RESPONSES PROVIDED BY THE AI CHATBOT. YOU ACKNOWLEDGE THAT AI-GENERATED
        CONTENT MAY BE INACCURATE, INCOMPLETE, OR REFLECT BIASES.
      </p>
      <p>
        YOUR USE OF THE SERVICE AND ANY RELIANCE YOU PLACE ON SUCH INFORMATION OR RESPONSES IS
        STRICTLY AT YOUR OWN RISK.
      </p>

      <h2
        style={{
          borderBottom: "1px solid #eee",
          paddingBottom: "6px",
          marginTop: "35px",
          fontSize: "1.4em",
          color: "#111",
        }}
      >
        8. Limitation of Liability
      </h2>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL {yourNameOrCompany},
        NOR ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES, BE LIABLE FOR ANY
        INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT
        LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM
        (I) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE; (II) ANY CONDUCT OR
        CONTENT OF ANY THIRD PARTY ON THE SERVICE; (III) ANY CONTENT OR RESPONSES OBTAINED FROM THE
        SERVICE; AND (IV) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT,
        WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY,
        WHETHER OR NOT WE HAVE BEEN INFORMED OF THE POSSIBILITY OF SUCH DAMAGE, AND EVEN IF A REMEDY
        SET FORTH HEREIN IS FOUND TO HAVE FAILED OF ITS ESSENTIAL PURPOSE.
      </p>

      <h2
        style={{
          borderBottom: "1px solid #eee",
          paddingBottom: "6px",
          marginTop: "35px",
          fontSize: "1.4em",
          color: "#111",
        }}
      >
        9. Termination
      </h2>
      <p>
        We may terminate or suspend your access to our Service immediately, without prior notice or
        liability, for any reason whatsoever, including without limitation if you breach these
        Terms.
      </p>

      <h2
        style={{
          borderBottom: "1px solid #eee",
          paddingBottom: "6px",
          marginTop: "35px",
          fontSize: "1.4em",
          color: "#111",
        }}
      >
        10. Changes to Terms
      </h2>
      <p>
        We reserve the right, at our sole discretion, to modify or replace these Terms at any time.
        If a revision is material, we will make reasonable efforts to provide at least{" "}
        {noticePeriod} days&apos; notice prior to any new terms taking effect. What constitutes a
        material change will be determined at our sole discretion. By continuing to access or use
        our Service after those revisions become effective, you agree to be bound by the revised
        terms.
      </p>

      <h2
        style={{
          borderBottom: "1px solid #eee",
          paddingBottom: "6px",
          marginTop: "35px",
          fontSize: "1.4em",
          color: "#111",
        }}
      >
        11. Governing Law
      </h2>
      <p>
        These Terms shall be governed and construed in accordance with the laws of{" "}
        {governingLawLocation}, without regard to its conflict of law provisions.
      </p>

      <h2
        style={{
          borderBottom: "1px solid #eee",
          paddingBottom: "6px",
          marginTop: "35px",
          fontSize: "1.4em",
          color: "#111",
        }}
      >
        12. Contact Us
      </h2>
      <p className="contact-info" style={{ color: "#007bff" }}>
        If you have any questions about these Terms, please contact us at:{" "}
        <a href={`mailto:${contactEmail}`} style={{ color: "#007bff", textDecoration: "none" }}>
          {contactEmail}
        </a>
        .
      </p>
    </div>
  )
}
