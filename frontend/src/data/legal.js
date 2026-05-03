/**
 * Privacy Policy and Terms of Service content for CoreTriage.
 *
 * These are *templated* documents — adequate for a soft launch and Stripe
 * onboarding, but you should run them past a lawyer (or use a service like
 * Termly / iubenda) before any significant scale.
 *
 * Edit the OPERATOR / EFFECTIVE_DATE / CONTACT_EMAIL constants below to
 * personalise. Sections are arrays of { heading, body } so they render
 * consistently in the LegalModal component.
 */

export const OPERATOR = 'Mathew Budnik (CoreTriage)'
export const CONTACT_EMAIL = 'mathewbudnik@gmail.com'
export const EFFECTIVE_DATE = 'May 3, 2026'

export const PRIVACY_POLICY = {
  title: 'Privacy Policy',
  effective: EFFECTIVE_DATE,
  intro: `${OPERATOR} ("we", "us") operates the CoreTriage application. This Privacy Policy explains what information we collect, how we use it, who we share it with, and your rights regarding your data.`,
  sections: [
    {
      heading: '1. Information We Collect',
      body: [
        'Account information: your email address and a securely hashed copy of your password. We never store your password in plaintext.',
        'Health and injury information: the body region, pain level, mechanism, symptoms, and free-text descriptions you submit through the triage flow. This information is stored under your account so you can review your history.',
        'Profile information: optional details you provide such as climbing experience, primary discipline, and training preferences.',
        'Chat and coaching messages: the text content of messages you send through the AI chat or to a human coach.',
        'Payment information: if you subscribe to Pro or Coaching, payment details are handled exclusively by our payment processor, Stripe. We never see or store your card number, CVV, or expiration date — we only store a Stripe customer ID and subscription status.',
        'Operational data: log entries for sign-in events (timestamp, IP address, success/failure) used to detect abuse. Standard request logs (route, status, timing) used to operate the service.',
      ],
    },
    {
      heading: '2. How We Use Your Information',
      body: [
        'To provide the triage, rehab, and training features of the application.',
        'To send your chat or triage content to OpenAI for AI processing. See Section 4 for third-party processing details.',
        'To enable communication between you and a human coach if you have applied for and been accepted into the coaching program.',
        'To process payments and manage your subscription via Stripe.',
        'To send transactional emails (account verification, password reset, payment receipts). We do not send marketing emails without your explicit opt-in.',
        'To detect and prevent abuse, fraud, and security incidents.',
      ],
    },
    {
      heading: '3. Legal Basis for Processing (EEA / UK Users)',
      body: [
        'Where you are in the European Economic Area or United Kingdom, our legal basis for processing is one or more of: (a) performance of a contract with you (providing the service you signed up for); (b) your consent (which you may withdraw at any time); (c) our legitimate interests in operating and securing the service; (d) compliance with legal obligations.',
      ],
    },
    {
      heading: '4. Third-Party Service Providers',
      body: [
        'OpenAI: We send chat and triage prompts to OpenAI to generate AI responses. OpenAI may retain API requests for up to 30 days for abuse monitoring per their data usage policy. Do not include personally identifying information in your free-text fields.',
        'Stripe: Handles all payment processing. Subject to Stripe\'s Privacy Policy at https://stripe.com/privacy.',
        'Hosting providers: Our application and database are hosted by third-party infrastructure providers (such as Vercel and a managed Postgres provider). These providers process data only as needed to host the service.',
        'We do not sell, rent, or share your information with advertisers or data brokers.',
      ],
    },
    {
      heading: '5. Data Retention',
      body: [
        'We retain your account, sessions, and profile data for as long as your account is active. If you delete your account, we delete or anonymise your personal data within 30 days, except where we are required to retain certain records (for example, payment records for tax or accounting purposes).',
        'Operational logs are retained for up to 90 days for security and debugging purposes.',
      ],
    },
    {
      heading: '6. Your Rights',
      body: [
        'You have the right to access the personal data we hold about you, correct it if inaccurate, request deletion, restrict or object to certain processing, and (where applicable) request a portable copy of your data.',
        'You can exercise these rights by emailing ' + CONTACT_EMAIL + '. We will respond within 30 days.',
        'If you are in the EEA, UK, or California, you also have the right to lodge a complaint with your local data protection authority.',
      ],
    },
    {
      heading: '7. Security',
      body: [
        'We use industry-standard security measures including bcrypt password hashing, encrypted connections (HTTPS), rate limiting, request size limits, and parameterised database queries. No system is perfectly secure, but we take reasonable steps to protect your data.',
        'In the event of a data breach affecting your personal information, we will notify you and the relevant authorities as required by applicable law.',
      ],
    },
    {
      heading: '8. Children',
      body: [
        'CoreTriage is not directed at children under 13 years of age. We do not knowingly collect personal data from children under 13. If you believe we have collected such data, please contact ' + CONTACT_EMAIL + ' and we will delete it promptly.',
      ],
    },
    {
      heading: '9. International Data Transfers',
      body: [
        'Our service is operated in the United States. If you access the service from outside the US, your information will be transferred to and processed in the US. By using the service, you consent to this transfer.',
      ],
    },
    {
      heading: '10. Changes to This Policy',
      body: [
        'We may update this Privacy Policy from time to time. The effective date at the top of this policy will indicate when it was last updated. Material changes will be communicated via email or in-app notice.',
      ],
    },
    {
      heading: '11. Contact',
      body: [
        'For privacy questions or to exercise your rights, contact: ' + CONTACT_EMAIL,
      ],
    },
  ],
}

export const TERMS_OF_SERVICE = {
  title: 'Terms of Service',
  effective: EFFECTIVE_DATE,
  intro: `Welcome to CoreTriage. These Terms of Service ("Terms") govern your use of the CoreTriage application operated by ${OPERATOR}. By creating an account or using the service, you agree to these Terms.`,
  sections: [
    {
      heading: '1. The Service',
      body: [
        'CoreTriage provides educational climbing-injury triage, rehab guidance, and training-plan tools. The service may include AI-generated content and, for paying subscribers who apply and are accepted, communication with a human coach.',
      ],
    },
    {
      heading: '2. Not Medical Advice',
      body: [
        'CoreTriage is an educational tool. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare provider regarding any medical condition.',
        'In case of a medical emergency, call 911 (or your local emergency number) — do not use this app.',
        'You acknowledge that you use the service at your own risk and that ' + OPERATOR + ' is not a healthcare provider.',
      ],
    },
    {
      heading: '3. Eligibility',
      body: [
        'You must be at least 13 years old to create an account. By using the service, you represent that you meet this requirement and that the information you provide is accurate.',
      ],
    },
    {
      heading: '4. Accounts',
      body: [
        'You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Notify us immediately at ' + CONTACT_EMAIL + ' if you suspect unauthorised access.',
        'We may suspend or terminate accounts that violate these Terms, abuse the service, or pose a security risk.',
      ],
    },
    {
      heading: '5. Subscriptions and Payments',
      body: [
        'The Pro subscription is billed monthly at the rate displayed at checkout. Payments are processed by Stripe. Your subscription auto-renews each month unless cancelled before the renewal date.',
        'You may cancel at any time through the account management portal. Cancellation takes effect at the end of the current billing period; no partial refunds are given for unused time.',
        'Coaching is a separate, application-only service billed monthly. We reserve the right to accept or decline coaching applications at our discretion and to discontinue coaching with a given user with reasonable notice.',
        'Pricing may change with at least 30 days notice. Existing subscribers will be notified by email before any change takes effect.',
      ],
    },
    {
      heading: '6. Acceptable Use',
      body: [
        'You agree not to: (a) use the service for any unlawful purpose; (b) attempt to gain unauthorised access to any part of the service; (c) reverse-engineer, decompile, or scrape the service; (d) submit content that is harassing, defamatory, or violates anyone\'s rights; (e) attempt to use the AI features to generate harmful, illegal, or deceptive content; (f) circumvent rate limits, tier gates, or other technical controls.',
        'We reserve the right to suspend access for violations.',
      ],
    },
    {
      heading: '7. AI Content',
      body: [
        'The service uses third-party AI models (currently OpenAI) to generate responses. AI output may contain errors and should not be relied upon for medical, legal, or other professional decisions. You are responsible for evaluating the appropriateness of any AI-generated content for your situation.',
      ],
    },
    {
      heading: '8. Your Content',
      body: [
        'You retain ownership of the content you submit (triage entries, chat messages, profile information). By submitting content, you grant us a limited license to store, process, and display it as needed to provide the service to you.',
        'You represent that you have the right to submit any content you provide and that it does not infringe on anyone else\'s rights.',
      ],
    },
    {
      heading: '9. Intellectual Property',
      body: [
        'The CoreTriage application, its interface, content (excluding your submissions), and underlying code are owned by ' + OPERATOR + ' and protected by copyright and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without permission.',
      ],
    },
    {
      heading: '10. Disclaimers',
      body: [
        'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.',
        'WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.',
      ],
    },
    {
      heading: '11. Limitation of Liability',
      body: [
        'TO THE FULLEST EXTENT PERMITTED BY LAW, ' + OPERATOR.toUpperCase() + ' SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUE, ARISING FROM YOUR USE OF THE SERVICE.',
        'OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRIOR TO THE CLAIM.',
      ],
    },
    {
      heading: '12. Indemnification',
      body: [
        'You agree to indemnify and hold harmless ' + OPERATOR + ' from any claims, damages, or expenses arising from your violation of these Terms or your misuse of the service.',
      ],
    },
    {
      heading: '13. Termination',
      body: [
        'You may close your account at any time. We may suspend or terminate your access for violation of these Terms, non-payment, or at our discretion with reasonable notice. Upon termination, your access ceases immediately; data deletion follows the timeline in our Privacy Policy.',
      ],
    },
    {
      heading: '14. Governing Law',
      body: [
        'These Terms are governed by the laws of the State of Texas, USA, without regard to its conflict-of-laws principles. Any disputes shall be resolved in the state or federal courts located in Texas, and you consent to the personal jurisdiction of those courts.',
      ],
    },
    {
      heading: '15. Changes to These Terms',
      body: [
        'We may update these Terms from time to time. The effective date at the top will indicate the latest revision. Continued use of the service after changes constitutes acceptance of the updated Terms.',
      ],
    },
    {
      heading: '16. Contact',
      body: [
        'Questions about these Terms? Contact: ' + CONTACT_EMAIL,
      ],
    },
  ],
}
