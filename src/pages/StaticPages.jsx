import React from "react";
import { theme } from "../components/ui";

const UPDATED = "24 September 2026";
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

/* ---------------- About ---------------- */

export function AboutPage() {
  return (
    <Article title="About Naomi Music" updated={null}>
      <P>
        Naomi Music is a home for South African music — Afrobeats, Amapiano, Hip Hop, Gospel, House, Kwaito,
        and everything in between. Built for artists and listeners, without the noise.
      </P>

      <H2>For listeners</H2>
      <Ul>
        <Li>Browse and play songs from artists across the country</Li>
        <Li>Build playlists and like what you love</Li>
        <Li>Message artists directly once they approve your request</Li>
      </Ul>

      <H2>For artists</H2>
      <Ul>
        <Li>Upload singles and albums with credits and lyrics</Li>
        <Li>Every submission is reviewed before it goes live</Li>
        <Li>Track your uploads and talk to your listeners</Li>
      </Ul>

      <H2>The rules</H2>
      <P>Keep it simple, keep it clean. No disses, no explicit overload, no stolen work.</P>

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

      <H2>What you can't do</H2>
      <Ul>
        <Li><strong>No diss tracks.</strong> Songs that attack, threaten, or target another person aren't allowed.</Li>
        <Li><strong>No excessive explicit language.</strong> Some language is fine; a track that's mostly censored-word-overload is not.</Li>
        <Li><strong>No other people's work.</strong> Only upload music you wrote, own, or have written permission to distribute.</Li>
        <Li><strong>No licensed music.</strong> Don't upload tracks that belong to a label or that you've licensed elsewhere with restrictions.</Li>
        <Li>No harassment, hate speech, or threats.</Li>
        <Li>No impersonation of another person or artist.</Li>
        <Li>No spam, malware, or scraping.</Li>
      </Ul>

      <H2>Review</H2>
      <P>
        Every artist upload is reviewed before it goes live. If a submission breaks the rules above, we'll
        decline it. Repeated violations can lead to account suspension.
      </P>

      <H2>Your account</H2>
      <P>
        You're responsible for your password and everything that happens under your account. If you notice
        something wrong, change your password and let us know.
      </P>

      <H2>Your music</H2>
      <P>
        You keep full ownership of everything you upload. By uploading, you give us permission to host and
        stream it on Naomi Music. That permission ends when you delete the song.
      </P>

      <H2>Changes</H2>
      <P>
        We may update these terms as the platform grows. Continued use means you accept the latest version.
      </P>

      <H2>Contact</H2>
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
        <Li><strong>Cloud hosting</strong> — to serve the site</Li>
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

/* ---------------- T's and C's (artist submission rules) ---------------- */

export function TsCsPage() {
  return (
    <Article title="Artist Rules">
      <P>
        Short version — four rules. Read them before you upload.
      </P>

      <H2>1. No disses</H2>
      <P>
        Don't upload songs that attack, threaten, or target another person by name. If your track is a
        direct shot at someone, it's not for this platform.
      </P>

      <H2>2. No explicit overload</H2>
      <P>
        Some language is fine. A track that's mostly censored word after censored word isn't. Use judgment —
        if you'd be uncomfortable playing it in front of a mixed crowd, it probably doesn't belong here.
      </P>

      <H2>3. No other people's work</H2>
      <P>
        Only upload music you wrote, own, or have explicit written permission to distribute. That means:
      </P>
      <Ul>
        <Li>No covers without the original rights holder's permission</Li>
        <Li>No remixes without permission from the original artist</Li>
        <Li>No beats you don't have the rights to</Li>
        <Li>No featured vocals without the featured artist's consent</Li>
      </Ul>

      <H2>4. No licensed music</H2>
      <P>
        If your song is signed to a label, distributed by a service (DistroKid, TuneCore, etc.), or licensed
        somewhere else with restrictions, don't upload it here. Naomi Music is a promotional platform — we
        don't pay royalties, and we don't want to cause rights issues for you.
      </P>

      <H2>How review works</H2>
      <P>
        Every upload goes into a queue. An admin listens and either approves or declines. If your song breaks
        one of the four rules above, it'll be declined. Repeated violations can get your account suspended.
      </P>

      <H2>Removing your music</H2>
      <P>
        You can remove your own songs at any time. We may also remove content if we receive a valid takedown
        notice or if it violates these rules.
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
        Naomi Music is built and maintained independently. The goal: give South African artists a clean, fast
        place to publish their music.
      </P>

      <H2>Stack</H2>
      <Ul>
        <Li><strong>Frontend:</strong> React + Vite</Li>
        <Li><strong>Backend:</strong> Appwrite (auth, database, storage, functions)</Li>
        <Li><strong>Hosting:</strong> self-hosted, running on Linux</Li>
      </Ul>

      <H2>What's next</H2>
      <Ul>
        <Li>Real-time chat updates</Li>
        <Li>Artist profile pages with discographies</Li>
        <Li>Playback analytics for artists</Li>
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
