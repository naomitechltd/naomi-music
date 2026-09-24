import React from "react";
import { theme } from "../components/ui";

const UPDATED = "24 September 2026";
const CONTACT_EMAIL = "hello@naomimusic.app";

function Article({ title, updated = UPDATED, children }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px 100px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{title}</h1>
      {updated && <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 24 }}>Last updated: {updated}</div>}
      <div style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.9 }}>{children}</div>
    </div>
  );
}

function H2({ children }) {
  return <h2 style={{ fontSize: 15.5, fontWeight: 700, marginTop: 26, marginBottom: 10 }}>{children}</h2>;
}

function P({ children }) {
  return <p style={{ marginBottom: 12 }}>{children}</p>;
}

function Ul({ children }) {
  return <ul style={{ paddingLeft: 22, marginBottom: 12 }}>{children}</ul>;
}

function Li({ children }) {
  return <li style={{ marginBottom: 6 }}>{children}</li>;
}

function A({ href, children }) {
  return (
    <a href={href} style={{ color: theme.accent, textDecoration: "underline" }} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/* ---------------- About ---------------- */

export function AboutPage() {
  return (
    <Article title="About Naomi Music" updated={null}>
      <P>
        Naomi Music is a home for South African music — Afrobeats, Amapiano, Hip Hop, Gospel, House, Kwaito,
        and everything in between. We exist to give artists a direct line to their listeners, and listeners a
        place to discover what's coming next.
      </P>

      <H2>For listeners</H2>
      <Ul>
        <Li>Browse a curated collection of songs and albums</Li>
        <Li>Build playlists, like what you love, and pick up where you left off</Li>
        <Li>Message artists directly (once they approve your request)</Li>
      </Ul>

      <H2>For artists</H2>
      <Ul>
        <Li>Upload singles and albums with full credits and lyrics</Li>
        <Li>Every submission is reviewed before it goes live — quality over noise</Li>
        <Li>Track your uploads and see what's approved, pending, or declined</Li>
        <Li>Talk to your listeners through the built-in messaging</Li>
      </Ul>

      <H2>How it works</H2>
      <P>
        Create an account, choose whether you're a listener or an artist, and start exploring. Artists can
        upload from the moment their email is verified. Listeners can reach out to any artist by sending a
        message request — the artist decides who they talk to.
      </P>

      <H2>Contact</H2>
      <P>
        Questions, feedback, or press? Reach us at <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
      </P>
    </Article>
  );
}

/* ---------------- Terms of Use ---------------- */

export function TermsPage() {
  return (
    <Article title="Terms of Use">
      <P>
        These Terms of Use govern your access to and use of Naomi Music (the "Service"). By creating an
        account or using the Service, you agree to be bound by these Terms.
      </P>

      <H2>1. Eligibility</H2>
      <P>
        You must be at least 13 years old to use Naomi Music. If you are under 18, you may only use the
        Service with the involvement of a parent or guardian.
      </P>

      <H2>2. Your account</H2>
      <P>
        You are responsible for the accuracy of the information you provide at signup and for keeping your
        password secure. You are responsible for all activity that occurs under your account.
      </P>

      <H2>3. Acceptable use</H2>
      <P>You agree not to:</P>
      <Ul>
        <Li>Harass, threaten, or abuse other users</Li>
        <Li>Upload content you don't have the rights to distribute</Li>
        <Li>Impersonate another person or artist</Li>
        <Li>Scrape, crawl, or otherwise bulk-extract content from the Service</Li>
        <Li>Attempt to bypass security controls, rate limits, or moderation</Li>
        <Li>Upload malware, spam, or illegal material</Li>
      </Ul>

      <H2>4. Content you upload</H2>
      <P>
        You retain ownership of any content you upload. By uploading, you grant Naomi Music a worldwide,
        non-exclusive, royalty-free license to host, store, stream, and display that content within the
        Service for as long as you keep it there.
      </P>

      <H2>5. Moderation</H2>
      <P>
        We review artist uploads before they go live. We may remove, edit, or decline any content at our
        discretion, especially if it violates these Terms or applicable law. We may suspend or terminate
        accounts that repeatedly violate them.
      </P>

      <H2>6. Messaging</H2>
      <P>
        Messaging is request-based. Listeners may send requests to artists; artists approve or decline at
        their sole discretion. Do not use messaging to send unsolicited advertising, hate, or harmful
        content. Attachments are limited to PDF and TXT files under 1 MB.
      </P>

      <H2>7. Disclaimers</H2>
      <P>
        The Service is provided "as is" without warranties of any kind. We do not guarantee uptime,
        availability of any specific content, or that use of the Service will meet your expectations.
      </P>

      <H2>8. Limitation of liability</H2>
      <P>
        To the maximum extent permitted by law, Naomi Music is not liable for any indirect, incidental, or
        consequential damages arising from your use of the Service.
      </P>

      <H2>9. Changes</H2>
      <P>
        We may update these Terms from time to time. If we make material changes, we will notify users
        through the Service. Continued use after changes means you accept the new Terms.
      </P>

      <H2>10. Contact</H2>
      <P>
        Questions about these Terms: <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
      </P>
    </Article>
  );
}

/* ---------------- Privacy Policy ---------------- */

export function PrivacyPage() {
  return (
    <Article title="Privacy Policy">
      <P>
        This Privacy Policy explains what information Naomi Music collects, how we use it, and the choices
        you have. We aim to collect as little as possible while keeping the Service working well.
      </P>

      <H2>Information we collect</H2>
      <Ul>
        <Li><strong>Account info:</strong> your name, email address, and password (hashed by our auth provider)</Li>
        <Li><strong>Profile:</strong> an optional avatar image, and your role (listener, artist, or admin)</Li>
        <Li><strong>Content you create:</strong> uploaded songs, cover art, lyrics, playlists, likes, and messages</Li>
        <Li><strong>Usage:</strong> basic logs (timestamps, IP address) generated by our hosting provider for security and rate limiting</Li>
      </Ul>

      <H2>How we use it</H2>
      <Ul>
        <Li>To operate your account and deliver the Service</Li>
        <Li>To review artist submissions and moderate the platform</Li>
        <Li>To let other users interact with you (e.g. your name and avatar shown on songs and in messages)</Li>
        <Li>To detect abuse, spam, or security issues</Li>
      </Ul>

      <H2>Who we share it with</H2>
      <P>
        We use third-party providers to run Naomi Music. These include:
      </P>
      <Ul>
        <Li><strong>Appwrite</strong> — authentication, database, and file storage</Li>
        <Li><strong>Cloud hosting</strong> — to serve the site and API endpoints</Li>
        <Li><strong>Email delivery</strong> — to send verification and password recovery emails</Li>
      </Ul>
      <P>
        We do not sell your personal information. We do not share your email address with other users unless
        you choose to (for example, by messaging them).
      </P>

      <H2>What other users can see</H2>
      <Ul>
        <Li>Your display name and avatar (if set)</Li>
        <Li>Songs you've uploaded (if you're an artist) once approved</Li>
        <Li>Messages you send within a conversation you're part of</Li>
        <Li>Like counts on songs are aggregated; individual likes are not shown publicly</Li>
      </Ul>

      <H2>Data retention</H2>
      <P>
        We keep your account and content for as long as your account is active. If you delete your account,
        we remove your personal information and content, subject to legal retention requirements.
      </P>

      <H2>Your rights</H2>
      <P>
        You can access, update, or delete most of your account data directly from the Profile page. To
        request a full export or deletion, email <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
      </P>

      <H2>Cookies and storage</H2>
      <P>
        Naomi Music stores a session token in your browser so you stay logged in. We do not use third-party
        tracking cookies.
      </P>

      <H2>Children</H2>
      <P>
        The Service is not directed to children under 13. We do not knowingly collect information from
        children under 13.
      </P>

      <H2>Security</H2>
      <P>
        Passwords are hashed by Appwrite. We use HTTPS for all traffic, enforce role-based access on the
        backend, and apply per-file and per-row permissions on uploaded content. No system is perfect — if
        you notice a security issue, contact us.
      </P>

      <H2>Contact</H2>
      <P>
        Privacy questions: <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
      </P>
    </Article>
  );
}

/* ---------------- T's and C's (artist submission terms) ---------------- */

export function TsCsPage() {
  return (
    <Article title="Artist Terms & Conditions">
      <P>
        These terms apply specifically to artists who upload music to Naomi Music. They are in addition to
        the general <strong>Terms of Use</strong>.
      </P>

      <H2>1. Eligibility</H2>
      <P>
        To upload, you must have a verified email address and be registered as an artist. Your account must
        be in good standing.
      </P>

      <H2>2. You own your music</H2>
      <P>
        You keep full ownership of every song, album, cover image, lyric sheet, and credit you upload. We
        never take ownership of your work.
      </P>

      <H2>3. The license you grant us</H2>
      <P>
        By uploading, you grant Naomi Music a non-exclusive, worldwide, royalty-free license to:
      </P>
      <Ul>
        <Li>Store and stream your audio within the Service</Li>
        <Li>Display your cover art, lyrics, and metadata to users</Li>
        <Li>Show your artist name alongside your songs</Li>
      </Ul>
      <P>
        This license ends when you delete the content, except for backups retained briefly for technical
        reasons.
      </P>

      <H2>4. You warrant that you have the rights</H2>
      <P>
        By uploading, you confirm that:
      </P>
      <Ul>
        <Li>You wrote or licensed the song, or have written permission from the rights holders</Li>
        <Li>Any featured artists, producers, or songwriters have consented</Li>
        <Li>You are not uploading something already owned by a label that prohibits distribution here</Li>
        <Li>Nothing in the upload infringes a third party's copyright, trademark, or other rights</Li>
      </Ul>

      <H2>5. Prohibited content</H2>
      <P>We do not accept uploads that:</P>
      <Ul>
        <Li>Infringe someone else's copyright or trademark</Li>
        <Li>Contain hate speech, harassment, or threats</Li>
        <Li>Are sexually explicit or promote violence</Li>
        <Li>Contain malware, spam, or misleading metadata</Li>
      </Ul>

      <H2>6. Review process</H2>
      <P>
        Every upload enters a review queue. An admin will listen and either approve or decline it. We may
        also request edits to metadata before approving. Reasons for decline include quality, rights issues,
        or content that violates these terms.
      </P>

      <H2>7. Royalties</H2>
      <P>
        Naomi Music is currently a promotional platform — we do not collect or pay royalties. You retain the
        right to monetize your music elsewhere. If we introduce a payment or royalty program in the future,
        we will announce it clearly and it will be opt-in.
      </P>

      <H2>8. Takedown and removal</H2>
      <P>
        You may remove your own songs at any time. We may remove content if we receive a valid takedown
        notice, if required by law, or if it violates these terms.
      </P>

      <H2>9. Indemnity</H2>
      <P>
        You agree to indemnify and hold Naomi Music harmless from any claims arising from content you
        upload, including claims by rights holders.
      </P>

      <H2>10. Contact</H2>
      <P>
        Artist questions: <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
      </P>
    </Article>
  );
}

/* ---------------- Developer ---------------- */

export function DeveloperPage() {
  return (
    <Article title="Developer" updated={null}>
      <P>
        Naomi Music is built and maintained independently. The goal is simple: give South African artists a
        clean, fast place to publish their music, without the noise of larger platforms.
      </P>

      <H2>Stack</H2>
      <Ul>
        <Li><strong>Frontend:</strong> React + Vite</Li>
        <Li><strong>Backend:</strong> Appwrite (auth, database, storage, functions)</Li>
        <Li><strong>Deployment:</strong> self-hosted, running on Linux</Li>
      </Ul>

      <H2>What's next</H2>
      <Ul>
        <Li>Real-time chat updates (currently refreshes every few seconds)</Li>
        <Li>Artist profile pages with discographies</Li>
        <Li>Playback analytics for artists</Li>
        <Li>Public API for other apps to build on top of Naomi Music</Li>
      </Ul>

      <H2>Get in touch</H2>
      <P>
        Interested in contributing, partnering, or reporting a security issue? Email{" "}
        <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
      </P>

      <H2>Report a bug</H2>
      <P>
        If something isn't working, please include:
      </P>
      <Ul>
        <Li>What you were trying to do</Li>
        <Li>What happened instead</Li>
        <Li>Your browser and device (if relevant)</Li>
        <Li>A screenshot if possible</Li>
      </Ul>

      <div style={{ marginTop: 32, fontSize: 12, opacity: 0.5, textAlign: "center" }}>
        Naomi Music · Built in South Africa
      </div>
    </Article>
  );
}
