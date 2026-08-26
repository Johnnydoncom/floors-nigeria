# Floor Nigeria — Storefront

Next.js 16 storefront for Floor Nigeria, backed by a Laravel API. The catalogue,
room visualizer, calculator and quote flow all read live data from that API.

- **Frontend** — this repository. Next.js 16 (App Router, Cache Components),
  React 19, Tailwind 4, TypeScript.
- **Backend** — the `floorsng-backend` repository. Laravel 13 serving
  `/api/v1`, with the catalogue imported from the live WooCommerce store.

## Running locally

Both applications run side by side. Start the API first — the storefront reads
from it at build and request time.

### 1. The API

```bash
cd ../backend
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed          # roles, settings, then the catalogue import
php artisan storage:link            # serves product media out of public/storage
php artisan serve                   # http://localhost:8000
```

`migrate --seed` pulls real products from floornigeria.com's WooCommerce Store
API. To re-import at any point:

```bash
php artisan catalog:import-woocommerce --limit=60
```

### 2. The storefront

```bash
npm install
cp .env.example .env.local          # defaults point at http://localhost:8000
npm run dev                         # http://localhost:3000
```

### Environment

| Variable               | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `LARAVEL_API_URL`      | API base URL. Server-side only — never exposed to the browser. |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap and schema.org output.                 |
| `REVALIDATE_SECRET`    | Shared secret Laravel sends to purge cache tags on publish.    |

Product images are served through a same-origin `/media/*` proxy, so no CDN
host or CORS configuration is needed in development.

### Useful commands

```bash
npm run dev            # development server
npm run build          # production build (needs the API running)
npm start              # serve the production build
npx tsc --noEmit       # type check
npx eslint src         # lint
```

## Architecture notes

- [Room visualizer](docs/room-visualizer.md) — how a floor material is mapped
  into a photograph, and how to add automatic floor detection.

---

## The original design brief

### PROJECT

Create a complete world-class responsive UI for Floors Nigeria (Floors NG), Nigeria's premium flooring solutions company.

This is NOT a landing page.

This is an enterprise AI-powered flooring platform comparable to Apple, Mohawk Flooring, Shaw Floors, Interface, Tarkett and Airbnb in terms of UI quality.

The UI should feel premium, luxurious, architectural, modern and minimal.

The final design should be production-ready.

Do not create placeholder layouts.

Design every screen professionally.

---

# BRAND

Use the official Floors NG logo as the foundation of the visual identity.

The website color system MUST be extracted from the logo.

Brand Colors

Primary Charcoal

#56554D

Dark Charcoal

#3F3E38

Gold

#B59A34

Gold Light

#D2B85C

White

#FFFFFF

Off White

#F8F8F6

Neutral Background

#F2F2EE

Never use blue as the primary brand color.

Avoid generic SaaS gradients.

Use warm luxury tones.

The interface should resemble a premium architectural brand.

---

# DESIGN STYLE

Think

Apple.com

Tesla

Porsche

Mohawk Flooring

Shaw Floors

Interface

Airbnb

Notion

Stripe

The design language should be

Elegant

Minimal

Editorial

Large typography

Beautiful spacing

Large imagery

Glass effects only when appropriate

Luxury cards

Soft shadows

Rounded corners

Smooth animations

Immersive scrolling

Architecture photography

Natural lighting

Premium interiors

---

# TYPOGRAPHY

Display

Cabinet Grotesk

Headings

Clash Display

Body

Satoshi

Numbers

JetBrains Mono

Use strong typography hierarchy.

---

# DESIGN SYSTEM

Create a complete reusable component library.

Buttons

Cards

Forms

Inputs

Dropdowns

Select

Navigation

Breadcrumbs

Accordions

FAQ

Modal

Drawer

Toast

Calculator

Hero

Gallery

Product Card

Project Card

Blog Card

Testimonial Card

Chat Window

Product Comparison

Timeline

Statistics

Footer

Pagination

Carousel

Sidebar

Floating CTA

Loading Skeletons

Error States

Empty States

Everything should be reusable.

---

# WEBSITE STRUCTURE

Create ALL pages.

1 Home

2 About

3 Products

4 Product Details

5 Collections

6 Collection Details

7 Industries

8 Residential Solutions

9 Commercial Solutions

10 Hospitality

11 Healthcare

12 Education

13 Retail

14 Sports Flooring

15 Artificial Grass

16 Wall Panels

17 AI Room Visualizer

18 Floor Calculator

19 AI Design Assistant

20 Projects

21 Project Details

22 Blog

23 Blog Details

24 Downloads

25 FAQs

26 Contact

27 Book Consultation

28 Request Sample

29 Request Quote

30 Customer Dashboard

31 Authentication

32 Admin Dashboard

33 Search Results

34 Wishlist

35 Compare Products

36 Careers

37 Privacy

38 Terms

39 404

40 Maintenance Page

---

# HOMEPAGE

Create a premium homepage.

Sections

Luxury Hero

Featured Collections

AI Room Visualizer

AI Design Assistant

Calculator

Featured Products

Why Floors Nigeria

Luxury Projects

Industries

Statistics

Testimonials

Partner Logos

Knowledge Centre

Latest Articles

CTA

Footer

Use beautiful scroll animations.

Pinned sections.

Fade animations.

Mask reveals.

Micro interactions.

---

# PRODUCT EXPERIENCE

Every product page should include

Luxury image gallery

360 Viewer

Video

Specifications

Downloads

Installation Guide

Maintenance Guide

Warranty

Product Features

Technical Table

Related Products

Recently Viewed

Product Comparison

Room Visualizer

Calculator Integration

Request Quote

Request Sample

Share

---

# AI FEATURES

Design premium interfaces for

AI Room Visualizer

AI Chat Assistant

AI Product Finder

AI Style Matcher

AI Quote Generator

AI Interior Designer

AI Calculator

AI Voice Assistant

The AI should feel intelligent and modern.

Use floating cards.

Beautiful chat interface.

Typing animations.

AI suggestions.

Conversation history.

Prompt examples.

---

# ROOM VISUALIZER

Create a complete interface.

Upload room

Drag and Drop

Sample Rooms

Product Selection

Lighting Controls

Comparison Mode

Download

Share

Before After

Processing State

History

Saved Designs

---

# FLOOR CALCULATOR

Professional calculator

Room Shapes

Measurements

Area

Waste

Product Selection

Pricing

Installation Cost

Accessories

Quote Generation

Download PDF

Email Quote

Save Project

---

# PROJECTS

Luxury portfolio.

Before After

High resolution images

Project information

Architect

Location

Products Used

Gallery

Videos

Testimonials

Related Projects

---

# BLOG

Modern editorial design.

Categories

Search

Reading Progress

Share

Author

Related Posts

Newsletter

---

# CUSTOMER DASHBOARD

Overview

Saved Products

Saved Rooms

Quotes

Orders

Invoices

Calculator History

Visualizer History

Notifications

Support Tickets

Profile

Settings

---

# ADMIN DASHBOARD

Enterprise CMS

Dashboard

Products

Collections

Projects

Blog

Media

SEO

Analytics

Customers

Orders

Quotes

AI Conversations

Settings

Roles

Permissions

Audit Logs

---

# RESPONSIVE

Desktop

Laptop

Tablet

Mobile

Ultra Wide

Everything must be responsive.

---

# COMPONENT QUALITY

Every card should feel premium.

Soft shadows.

Rounded corners.

Hover animations.

Image zoom.

Elegant buttons.

Luxury spacing.

Smooth transitions.

---

# MOTION

Use Framer Motion.

Fade

Slide

Reveal

Parallax

Scale

Card Lift

Image Zoom

Number Counter

Loading Skeleton

Animated Gradient

Page Transition

Scroll Reveal

---

# ICONS

Lucide Icons

Consistent size

Minimal

Elegant

---

# IMAGES

Use premium architecture photography.

Luxury interiors.

Modern offices.

Hotels.

Restaurants.

Luxury homes.

Beautiful wooden floors.

Luxury vinyl.

Stone flooring.

SPC flooring.

Artificial grass.

Wall panels.

Avoid stock-looking images.

---

# ACCESSIBILITY

WCAG 2.2 AA

Keyboard Navigation

Screen Readers

Focus States

High Contrast

Reduced Motion

Semantic HTML

---

# PERFORMANCE

Optimized images

Lazy loading

Modern formats

Fast transitions

Skeleton loading

Code splitting

Responsive images

---

# SEO

Design SEO-friendly layouts.

Schema ready.

Breadcrumbs.

Meta friendly.

Semantic structure.

---

# TECHNOLOGY

Use

Next.js 16

React 19

Tailwind CSS v4

TypeScript

Framer Motion

shadcn/ui

Lucide React

React Hook Form

Zod

TanStack Query

Server Components

App Router

Server Actions

Modern architecture.

---

# UI QUALITY

This should look like it was designed by a top international product design agency.

No generic templates.

No Bootstrap appearance.

No repeated cards.

No low-quality spacing.

Every section should feel intentional.

Every page should feel premium.

Every animation should feel polished.

---

# DELIVERABLE

Generate an entire clickable high-fidelity UI with all pages connected.

Use realistic content relevant to Nigeria.

Use premium flooring photography.

Use the Floors NG branding.

Create all reusable components.

Create all layouts.

Create dark and light mode.

Everything should be production-ready.

The final result should look like a $250,000 enterprise website for a luxury flooring company.

NOTE: No generic design. Prioritize usage of quality images instead of icon.
Creativity must be used entirely.

IMPORTANT: Use the attached official logo wherever required, not some random logo.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/951af6d5-2f5e-4090-bd77-f67f49512c7a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
