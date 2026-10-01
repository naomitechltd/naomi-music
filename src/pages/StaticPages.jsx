import React from "react";
import { theme } from "../components/ui";

const UPDATED = "1 October 2026";
const CONTACT_EMAIL = "naomitechltd@gmail.com";

function Article({ title, updated = UPDATED, children }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px 100px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{title}</h1>
      {updated && <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 24 }}>Last updated: {updated}</div>}
      <div style={{ fontSize: 14.5, lineHeight: 1.7, opacity: 0.9 }}>{children}</div>
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

function Warn({ children }) {
  return (
    <div style={{
      margin: "14px 0",
      padding: "12px 14px",
      background: "rgba(255,152,0,0.08)",
      border: "1px solid rgba(255,152,0,0.35)",
      borderRadius: 8,
      fontSize: 13.5,
      lineHeight: 1.65,
    }}>
      {children}
    </div>
  );
}

/* ---------------- About ---------------- */

export function AboutPage() {
  return (
    <Article title="About Naomi Music" updated={null}>
      <P>
        Naomi Music is a home for original South African music — Afrobeats, Amapiano, Hip Hop,
        Gospel, House, Kwaito, and everything in between. Built by artists, for artists.
      </P>

      <H2>Our stance</H2>
      <P>
        We promote <strong>raw, original work</strong>. Real producers. Real sessions. Real craft.
        Nothing copy-pasted. Nothing AI-generated. Nothing borrowed.
      </P>

      <H2>For listeners</H2>
      <Ul>
        <Li>Browse and play songs from verified, vetted artists</Li>
        <Li>Build playlists and follow what you love</Li>
        <Li>Message artists directly</Li>
      </Ul>

      <H2>For artists</H2>
      <Ul>
        <Li>Upload singles and albums with full credits and lyrics</Li>
        <Li>Every submission is manually reviewed before it goes live</Li>
        <Li>We verify your producers and studio before approving</Li>
        <Li>Talk to your listeners, build your audience</Li>
      </Ul>

      <H2>The rules</H2>
      <P>
        Your own work only. No AI music. No AI covers. Producer and studio sign-off required.
        See <strong>Artist Rules</strong> for full details and enforcement policy.
      </P>

      <H2>Contact</H2>
      <P>
        <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>
      </P>
    </Article>
  );
}

/* ---------------- Terms of Use ---------------- */

export function TermsPage() {
  return (
    <Article title="Terms of Use">
      <P>
        By creating an account or using Naomi Music, you agree to these terms.
      </P>

      <H2>1. What you can't do</H2>
      <Ul>
        <Li><strong>No diss tracks.</strong> Songs that attack, threaten, or target another person aren't allowed.</Li>
        <Li><strong>No excessive explicit language.</strong> Some language is fine; a track that's mostly explicit-word overload isn't.</Li>
        <Li><strong>No other people's work.</strong> Only upload music you wrote, own, or have explicit written permission to distribute.</Li>
        <Li><strong>No AI-generated music or AI-generated artwork.</strong> Both are grounds for immediate removal and account action.</Li>
        <Li><strong>No licensed music.</strong> Don't upload tracks that belong to a label or that you've licensed elsewhere with restrictions.</Li>
        <Li><strong>No harassment, hate speech, or threats.</strong></Li>
        <Li><strong>No impersonation</strong> of another person or artist.</Li>
        <Li><strong>No spam, malware, or scraping.</strong></Li>
      </Ul>

      <H2>2. Review and verification</H2>
      <P>
        Every artist upload is manually reviewed before it goes live. As part of review, we may contact
        the producer(s) and studio manager listed on your submission to confirm they consented to the
        release. If we cannot obtain consent, the submission is declined.
      </P>

      <H2>3. Enforcement</H2>
      <P>
        Breaking these terms has consequences. Penalties escalate:
      </P>
      <Ul>
        <Li><strong>Minor issues</strong> (metadata errors, bad language) → song declined, no account action.</Li>
        <Li><strong>Serious violations</strong> (stolen work, AI music, AI cover art) → one-month account block.</Li>
        <Li><strong>Repeat or severe violations</strong> → permanent termination, no appeal.</Li>
      </Ul>
      <Warn>
        <strong>Retroactive enforcement:</strong> if an upload is approved and we later discover that it
        violates these terms — including cases where our initial review missed something — the same
        penalties apply. Approval is not a permanent exemption.
      </Warn>

      <H2>4. Account restoration</H2>
      <P>
        If you're blocked for a serious violation, you may apply for reinstatement within 30 days.
        Reinstatement requires: (a) a written apology and admission, and (b) settlement of a
        <strong> restoration fine of R500</strong>, payable via an invoice we'll send. If reinstatement
        is not completed within 30 days, the account is permanently terminated with no further appeal.
      </P>
      <Warn>
        Fines are only levied for deliberate violations of our "no other people's work" and
        "no AI-generated content" rules. Not for metadata errors, disagreements, or first-time mistakes
        on otherwise legitimate work.
      </Warn>

      <H2>5. Your account</H2>
      <P>
        You're responsible for your password and everything that happens under your account. If you notice
        something wrong, change your password and contact us.
      </P>

      <H2>6. Your music</H2>
      <P>
        You keep full ownership of everything you upload. By uploading, you give us permission to host and
        stream it on Naomi Music. That permission ends when you delete the song.
      </P>

      <H2>7. Changes</H2>
      <P>
        We may update these terms as the platform grows. Continued use means you accept the latest version.
      </P>

      <H2>8. Contact</H2>
      <P>
        <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>
      </P>
    </Article>
  );
}

/* ---------------- Privacy Policy ---------------- */

export function PrivacyPage() {
  return (
    <Article title="Privacy Policy">
      <P>
        Here's what we collect, why, and what you can do about it.
      </P>

      <H2>What we collect</H2>
      <Ul>
        <Li><strong>Account:</strong> your name, email, password (hashed by our auth provider)</Li>
        <Li><strong>Profile:</strong> optional avatar and your role (listener / artist / admin)</Li>
        <Li><strong>Content you create:</strong> songs, cover art, lyrics, playlists, likes, messages</Li>
        <Li><strong>Basic logs:</strong> timestamps and IP for security and abuse prevention</Li>
      </Ul>

      <H2>Who can see what</H2>
      <Ul>
        <Li>Your display name and avatar are visible to other users</Li>
        <Li>Your songs (once approved) are public</Li>
        <Li>Your email is <strong>not</strong> shown to other users</Li>
        <Li>Your messages are only visible to you and the other person in the conversation</Li>
      </Ul>

      <H2>Who we share with</H2>
      <Ul>
        <Li><strong>Appwrite</strong> — auth, database, storage, server functions</Li>
        <Li><strong>Cloudflare</strong> — CDN and hosting for the frontend</Li>
        <Li><strong>Email provider</strong> — for verification and password recovery</Li>
      </Ul>
      <P>We don't sell your data. Ever.</P>

      <H2>Your rights</H2>
      <P>
        You can change your name, avatar, and password from the Profile page. To delete your account or
        request a copy of your data, email us.
      </P>

      <H2>Security</H2>
      <P>
        Passwords are hashed. All traffic is over HTTPS. Uploads have strict permissions and every artist
        submission is reviewed.
      </P>

      <H2>Children</H2>
      <P>
        Naomi Music isn't for kids under 13. If we learn an account belongs to someone younger, we'll remove
        it.
      </P>

      <H2>Contact</H2>
      <P>
        <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>
      </P>
    </Article>
  );
}

/* ---------------- Artist Rules ---------------- */

export function TsCsPage() {
  return (
    <Article title="Artist Rules">
      <P>
        Read all of this before you upload. These rules exist to protect the artists whose work you're
        uploading alongside, and to keep Naomi Music a place for real music.
      </P>

      <H2>1. Your own work only</H2>
      <P>
        Only upload music you wrote, own, or have <strong>explicit written permission</strong> to
        distribute. That means:
      </P>
      <Ul>
        <Li>No covers without the original rights holder's permission</Li>
        <Li>No remixes without permission from the original artist</Li>
        <Li>No beats you don't have the rights to</Li>
        <Li>No featured vocals without the featured artist's consent</Li>
        <Li>No sampled material without clearance</Li>
      </Ul>

      <H2>2. No AI-generated music</H2>
      <P>
        We don't accept tracks generated by AI tools — Suno, Udio, Boomy, AIVA, MusicGen, or any similar
        platform. This applies to vocals, instrumentals, and stems. We don't care how good it sounds.
      </P>

      <H2>3. No AI-generated cover art</H2>
      <P>
        Cover art must be original, human-made, or licensed with written permission. That means no
        Midjourney, DALL-E, Stable Diffusion, Leonardo, Ideogram, Flux, or similar. Photos you took,
        artwork you commissioned, or designs you created — those are fine.
      </P>

      <H2>4. Producer and studio sign-off</H2>
      <P>
        Every submission must list the producer(s) and, if applicable, the studio manager. Before we
        approve your work, we may contact them to confirm they consented to the release. This is for
        legal purposes and to prevent disputes.
      </P>
      <P>
        If we can't reach them or they deny consent, the submission is declined. Provide accurate contact
        details in your submission metadata or we can't complete the review.
      </P>

      <H2>5. No licensed music</H2>
      <P>
        If your song is signed to a label, distributed by a service (DistroKid, TuneCore, etc.), or
        licensed elsewhere with restrictions, don't upload it here. Naomi Music is a promotional platform
        — we don't pay royalties and we don't want to cause rights issues for you.
      </P>

      <H2>Enforcement</H2>
      <P>
        We take violations seriously. Here's what happens:
      </P>
      <Ul>
        <Li>
          <strong>Minor issues</strong> (bad metadata, missing credits, wrong genre) → submission
          declined, you fix it and re-submit. No account action.
        </Li>
        <Li>
          <strong>Serious violations</strong> (stolen work, AI music, AI art, uncredited samples,
          producer didn't consent) → <strong>one-month account block</strong>.
        </Li>
        <Li>
          <strong>Repeat offenses</strong> → permanent termination, no reinstatement.
        </Li>
      </Ul>

      <H2>Retroactive enforcement</H2>
      <P>
        Approval isn't permanent protection. If we later discover that an approved submission violated
        these rules — including cases where our initial inspection missed it — the same penalties apply
        going forward.
      </P>
      <Warn>
        <strong>Why we say this:</strong> we try our best to catch AI tracks and stolen work during
        review, but we can't guarantee we'll catch everything on the first listen. If you knowingly
        submit work that breaks these rules and expect it to slip through, know that the outcome is a
        block, not a pass.
      </Warn>

      <H2>Reinstatement</H2>
      <P>
        If you're blocked for a serious violation, you have <strong>30 days</strong> to apply for
        reinstatement. To be reinstated you must:
      </P>
      <Ul>
        <Li>Acknowledge the violation in writing</Li>
        <Li>Provide proof of corrective action (deleted the work, obtained proper permission, etc.)</Li>
        <Li>Settle a <strong>restoration fine of R500</strong> against an invoice we'll send you</Li>
      </Ul>
      <P>
        If reinstatement isn't completed within 30 days, the account is permanently terminated. No
        further appeal.
      </P>

      <H2>What we promote</H2>
      <P>
        Raw work. Original sessions. Real producers. Real studios. Real voices. If that's you, you're
        welcome here. Everything else can stay elsewhere.
      </P>

      <H2>Questions</H2>
      <P>
        <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>
      </P>
    </Article>
  );
}

/* ---------------- Developer ---------------- */

export function DeveloperPage() {
  return (
    <Article title="Developer" updated={null}>
      <P>
        Naomi Music is built and maintained independently. The goal: give South African artists a clean,
        fast place to publish original music.
      </P>

      <H2>Stack</H2>
      <Ul>
        <Li><strong>Frontend:</strong> React + Vite, hosted on Cloudflare Pages</Li>
        <Li><strong>Backend:</strong> Appwrite (auth, database, storage, server functions)</Li>
        <Li><strong>Deploys:</strong> automated via GitHub Actions on every push</Li>
      </Ul>

      <H2>What's next</H2>
      <Ul>
        <Li>Push notifications for messages</Li>
        <Li>Artist profile pages with discographies</Li>
        <Li>Playback analytics for artists</Li>
        <Li>AI-assisted moderation tools</Li>
      </Ul>

      <H2>Report a bug or security issue</H2>
      <P>
        Include what you were doing, what happened, and any screenshots. Email{" "}
        <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
      </P>

      <div style={{ marginTop: 32, fontSize: 12, opacity: 0.5, textAlign: "center" }}>
        Naomi Music · Built in South Africa
      </div>
    </Article>
  );
}
