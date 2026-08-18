--
-- PostgreSQL database dump
--

\restrict SWZttjcpiWLdUi7gFFjFj9c7fpHTsMSIM4EoWWCZwbcDNtMCWDgb7X2yyMc7sK8

-- Dumped from database version 17.10 (Debian 17.10-0+deb13u1)
-- Dumped by pg_dump version 17.10 (Debian 17.10-0+deb13u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS "products_categoryId_fkey";
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS "products_brandId_fkey";
ALTER TABLE IF EXISTS ONLY public.product_media DROP CONSTRAINT IF EXISTS "product_media_productId_fkey";
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS "orders_customerId_fkey";
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS "order_items_productId_fkey";
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS "order_items_orderId_fkey";
ALTER TABLE IF EXISTS ONLY public.banners DROP CONSTRAINT IF EXISTS "banners_homepageId_fkey";
DROP INDEX IF EXISTS public.products_status_idx;
DROP INDEX IF EXISTS public.products_slug_key;
DROP INDEX IF EXISTS public.products_sku_key;
DROP INDEX IF EXISTS public."products_categoryId_idx";
DROP INDEX IF EXISTS public."products_brandId_idx";
DROP INDEX IF EXISTS public."product_media_productId_sortOrder_idx";
DROP INDEX IF EXISTS public.orders_status_idx;
DROP INDEX IF EXISTS public."orders_orderNumber_key";
DROP INDEX IF EXISTS public."orders_idempotencyKey_key";
DROP INDEX IF EXISTS public."orders_customerId_idx";
DROP INDEX IF EXISTS public."orders_createdAt_idx";
DROP INDEX IF EXISTS public."order_items_productId_idx";
DROP INDEX IF EXISTS public."order_items_orderId_idx";
DROP INDEX IF EXISTS public.customer_users_email_key;
DROP INDEX IF EXISTS public.categories_slug_key;
DROP INDEX IF EXISTS public.brands_slug_key;
DROP INDEX IF EXISTS public."banners_active_sortOrder_idx";
DROP INDEX IF EXISTS public.admin_users_email_key;
ALTER TABLE IF EXISTS ONLY public.seo_settings DROP CONSTRAINT IF EXISTS seo_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.product_media DROP CONSTRAINT IF EXISTS product_media_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.homepage DROP CONSTRAINT IF EXISTS homepage_pkey;
ALTER TABLE IF EXISTS ONLY public.customer_users DROP CONSTRAINT IF EXISTS customer_users_pkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS ONLY public.brands DROP CONSTRAINT IF EXISTS brands_pkey;
ALTER TABLE IF EXISTS ONLY public.banners DROP CONSTRAINT IF EXISTS banners_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_users DROP CONSTRAINT IF EXISTS admin_users_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.seo_settings;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.product_media;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.order_items;
DROP TABLE IF EXISTS public.homepage;
DROP TABLE IF EXISTS public.customer_users;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.brands;
DROP TABLE IF EXISTS public.banners;
DROP TABLE IF EXISTS public.admin_users;
DROP TABLE IF EXISTS public._prisma_migrations;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    "passwordHash" text NOT NULL,
    role text DEFAULT 'admin'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banners (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    eyebrow text,
    image text,
    "imageAlt" text,
    "ctaText" text,
    "ctaLink" text,
    variant text DEFAULT 'split'::text NOT NULL,
    tone text,
    "mediaSide" text,
    active boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "homepageId" text DEFAULT 'homepage'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    logo text,
    "logoAlt" text,
    "seoTitle" text,
    "seoDescription" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    image text,
    "imageAlt" text,
    "group" text,
    featured boolean DEFAULT false NOT NULL,
    "seoTitle" text,
    "seoDescription" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: customer_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_users (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    "passwordHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: homepage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homepage (
    id text DEFAULT 'homepage'::text NOT NULL,
    eyebrow text,
    heading text NOT NULL,
    subheading text,
    badge text,
    image text,
    "imageAlt" text,
    "secondaryImage" text,
    "ctaText" text,
    "ctaLink" text,
    "secondaryCtaText" text,
    "secondaryCtaLink" text,
    "editorialEyebrow" text,
    "editorialHeading" text,
    "editorialDescription" text,
    "editorialImage" text,
    "editorialImageAlt" text,
    "editorialCtaText" text,
    "editorialCtaLink" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text,
    "productName" text NOT NULL,
    sku text,
    "productImage" text,
    "productSlug" text,
    size text,
    color text,
    quantity integer NOT NULL,
    "unitPrice" integer NOT NULL,
    "lineTotal" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id text NOT NULL,
    "orderNumber" text NOT NULL,
    "customerId" text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "paymentStatus" text DEFAULT 'UNPAID'::text NOT NULL,
    "customerName" text NOT NULL,
    "customerEmail" text NOT NULL,
    "customerPhone" text NOT NULL,
    "shippingAddress" text NOT NULL,
    city text NOT NULL,
    notes text,
    subtotal integer NOT NULL,
    "shippingFee" integer NOT NULL,
    "grandTotal" integer NOT NULL,
    "stockRestoredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "idempotencyKey" text
);


--
-- Name: product_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_media (
    id text NOT NULL,
    "productId" text NOT NULL,
    type text NOT NULL,
    url text NOT NULL,
    alt text,
    poster text,
    width integer,
    height integer,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    sku text,
    "shortDescription" text,
    description text,
    price integer NOT NULL,
    "salePrice" integer,
    stock integer DEFAULT 0 NOT NULL,
    "stockStatus" text DEFAULT 'in-stock'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    "newArrival" boolean DEFAULT false NOT NULL,
    "onSale" boolean DEFAULT false NOT NULL,
    sizes jsonb DEFAULT '[]'::jsonb NOT NULL,
    colors jsonb DEFAULT '[]'::jsonb NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    "seoTitle" text,
    "seoDescription" text,
    "categoryId" text NOT NULL,
    "brandId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: seo_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_settings (
    id text DEFAULT 'seo'::text NOT NULL,
    "siteTitle" text NOT NULL,
    "siteDescription" text NOT NULL,
    "defaultImage" text,
    keywords text[] DEFAULT ARRAY[]::text[],
    "ogTitle" text,
    "ogDescription" text,
    "ogImage" text,
    "twitterTitle" text,
    "twitterDescription" text,
    "twitterImage" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
5dba18cd-3ed2-4ce2-a836-b3bd0dfd6c77	528781dda337621b4365d233019682494d08be68b3124842cc8afd1fb4a4bedd	2026-08-16 12:11:15.35827+00	20260816121115_init	\N	\N	2026-08-16 12:11:15.337973+00	1
75d7747a-0903-46a4-ab2f-b09bbd8eb061	ca90142f6761270b91992a396326a45923d4c24bf08236646dfc9433e9ea8649	2026-08-16 14:38:08.061416+00	20260816143808_stage6_orders	\N	\N	2026-08-16 14:38:08.040934+00	1
32af7e03-83eb-4df6-94a6-e66237b66d70	8c80a2f8dc9da40015978b4af7d8e1c276dfd745688382427ac30b71be1164b8	2026-08-16 14:40:24.512246+00	20260816144023_stage6_order_idempotency	\N	\N	2026-08-16 14:40:24.50791+00	1
\.


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_users (id, email, name, "passwordHash", role, "createdAt", "updatedAt") FROM stdin;
cmsvrrksk000007nz109kzy2l	admin@shelina.local	Shelina Admin	$2b$12$5ZVyfKkuPv35ZeU7J4L/huJ0hcR9AqIHE5ctSsU3dmcmOq5ftRAZq	admin	2026-08-16 12:16:43.268	2026-08-17 11:58:24.865
\.


--
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.banners (id, title, description, eyebrow, image, "imageAlt", "ctaText", "ctaLink", variant, tone, "mediaSide", active, "sortOrder", "homepageId", "createdAt", "updatedAt") FROM stdin;
cmsx6jw93001e3qnzlb27dup7	Every step, your style	One workshop, one standard. Women’s and men’s styles cut from the same leather and finished by the same hands — so the pair you choose feels considered, whichever aisle it came from.	The Shelina promise	/images/banners/banner-everyday.jpg	Blush slides, tan chappals and white sneakers arranged on cream linen	Browse all styles	/shop	split	surface	right	t	0	homepage	2026-08-17 11:58:25.287	2026-08-17 11:58:25.287
cmsx6jw9a001f3qnzxqqxnvd7	Ninety-two steps, one pair	Every Shelina pair passes through the hands of a single artisan — from pattern cutting to the final polish. It is slower. It lasts longer.	The Shelina difference	/images/banners/banner-craft.jpg	Artisan hand-stitching leather footwear at a workbench	Our craft	/shop	split	cream	left	t	1	homepage	2026-08-17 11:58:25.294	2026-08-17 11:58:25.294
\.


--
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.brands (id, name, slug, description, logo, "logoAlt", "seoTitle", "seoDescription", "createdAt", "updatedAt") FROM stdin;
cmsvrrkuk000807nz1gbqojzj	Shelina	shelina	Our in-house atelier line.	/images/categories/ladies-chappals.jpg	Shelina in-house line	\N	\N	2026-08-16 12:16:43.341	2026-08-17 11:58:24.958
cmsvrrkux000907nzd5x337dl	Shelina Signature	shelina-signature	Limited seasonal editions.	/images/categories/ladies-shoes.jpg	Shelina Signature seasonal editions	\N	\N	2026-08-16 12:16:43.353	2026-08-17 11:58:24.963
cmsvrrkuz000a07nzlwpfzzza	Atelier Lahore	atelier-lahore	Traditional handwork, modern finish.	/images/categories/gents-chappals.jpg	Atelier Lahore handcrafted line	\N	\N	2026-08-16 12:16:43.355	2026-08-17 11:58:24.97
cmsvrrkv0000b07nztkyjghms	Shelina Active	shelina-active	Everyday sneakers and casual styles.	/images/categories/sneakers.jpg	Shelina Active sneakers line	\N	\N	2026-08-16 12:16:43.356	2026-08-17 11:58:24.978
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, slug, description, image, "imageAlt", "group", featured, "seoTitle", "seoDescription", "createdAt", "updatedAt") FROM stdin;
cmsvrt9xw00019anzozv498rq	New Arrivals	new-arrivals	The latest additions to the collection.	/images/categories/new-arrivals.jpg	New season leather footwear assortment	Featured	t	\N	\N	2026-08-16 12:18:02.516	2026-08-17 11:58:24.903
cmsvrrktz000207nz6400evuf	Ladies Chappals	ladies-chappals	Everyday elegance in soft leather.	/images/categories/ladies-chappals.jpg	Blush leather ladies chappals	Women	t	\N	\N	2026-08-16 12:16:43.319	2026-08-17 11:58:24.916
cmsvrrku1000307nzqhisktkl	Ladies Shoes	ladies-shoes	Heels, flats and formal silhouettes.	/images/categories/ladies-shoes.jpg	Dusty rose ladies court shoes	Women	t	\N	\N	2026-08-16 12:16:43.321	2026-08-17 11:58:24.918
cmsvrrku3000407nzohy7st28	Gents Chappals	gents-chappals	Handcrafted comfort, built to last.	/images/categories/gents-chappals.jpg	Tan leather gents chappals	Men	t	\N	\N	2026-08-16 12:16:43.323	2026-08-17 11:58:24.92
cmsvrrku5000507nzpyoefj9h	Gents Shoes	gents-shoes	Refined formals for every occasion.	/images/categories/gents-shoes.jpg	Brown leather gents formal shoes	Men	t	\N	\N	2026-08-16 12:16:43.325	2026-08-17 11:58:24.922
cmsvrrku8000607nz3jootf4s	Sneakers	sneakers	Clean lines, all-day cushioning.	/images/categories/sneakers.jpg	Minimal white sneakers	Unisex	t	\N	\N	2026-08-16 12:16:43.328	2026-08-17 11:58:24.923
cmsvrrkua000707nzv108qgal	Casual	casual	Relaxed styles for the weekend.	/images/categories/ladies-chappals.jpg	Casual footwear selection	Unisex	f	\N	\N	2026-08-16 12:16:43.33	2026-08-17 11:58:24.935
\.


--
-- Data for Name: customer_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_users (id, email, name, "passwordHash", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: homepage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.homepage (id, eyebrow, heading, subheading, badge, image, "imageAlt", "secondaryImage", "ctaText", "ctaLink", "secondaryCtaText", "secondaryCtaLink", "editorialEyebrow", "editorialHeading", "editorialDescription", "editorialImage", "editorialImageAlt", "editorialCtaText", "editorialCtaLink", "updatedAt") FROM stdin;
homepage	Autumn Edit 2026	Step into your style	Leather chappals, shoes and sneakers, finished by hand in Pakistan — built for the pace of your day.	New season	/images/hero/hero-main.jpg	Blush leather slide sandals styled on an ivory studio surface	\N	Shop the collection	/shop	Explore categories	/shop	The everyday edit	Find your everyday pair	The pair you reach for without thinking. Softened leather, a footbed that holds its shape, and a silhouette that works from morning errands to evening plans.	/images/editorial/editorial-everyday.jpg	A woman walking in blush leather slide sandals on a warm stone floor	Explore the edit	/shop	2026-08-17 12:54:57.21
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, "orderId", "productId", "productName", sku, "productImage", "productSlug", size, color, quantity, "unitPrice", "lineTotal", "createdAt") FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, "orderNumber", "customerId", status, "paymentStatus", "customerName", "customerEmail", "customerPhone", "shippingAddress", city, notes, subtotal, "shippingFee", "grandTotal", "stockRestoredAt", "createdAt", "updatedAt", "idempotencyKey") FROM stdin;
\.


--
-- Data for Name: product_media; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_media (id, "productId", type, url, alt, poster, width, height, "sortOrder", "createdAt") FROM stdin;
cmsx6jw1e000d3qnzxaon7wws	cmsvrrkvd000c07nz6h4f137i	image	/images/products/p1-a.jpg	Aurelia bow slide in blush leather, angled view	\N	1024	1280	0	2026-08-17 11:58:25.01
cmsx6jw1e000e3qnz0j1vq20q	cmsvrrkvd000c07nz6h4f137i	image	/images/products/p1-b.jpg	Aurelia bow slide pair, top view	\N	1024	1280	1	2026-08-17 11:58:25.01
cmsx6jw2l000g3qnzko0zhmci	cmsvrrkwx000f07nzn7orakrv	image	/images/products/p2-a.jpg	Meher embroidered beige suede flat	\N	1024	1280	0	2026-08-17 11:58:25.053
cmsx6jw30000i3qnzjk8e9w5h	cmsvrrkxk000h07nz19tgapf8	image	/images/products/p3-a.jpg	Noor dusty rose block heel court shoe	\N	1024	1024	0	2026-08-17 11:58:25.068
cmsx6jw3g000k3qnzox340rv0	cmsvrrkxx000j07nzcrm821jd	image	/images/products/p4-a.jpg	Shahzad brown leather oxford shoe	\N	1024	1280	0	2026-08-17 11:58:25.084
cmsx6jw3s000m3qnzzo6mkacm	cmsvrrkye000l07nz6kzbiqis	image	/images/products/p5-a.jpg	Drift minimal white low sneaker	\N	1024	1024	0	2026-08-17 11:58:25.096
cmsx6jw4c000o3qnzcovx5prv	cmsvrrkys000n07nz0mfh24tp	image	/images/products/p6-a.jpg	Peshawari heritage tan leather chappal	\N	1024	1024	0	2026-08-17 11:58:25.116
cmsx6jw4n000q3qnza21cxj5a	cmsvrrkyy000p07nzkqngngpn	image	/images/products/p1-b.jpg	Lina everyday slide, pair top view	\N	1024	1280	0	2026-08-17 11:58:25.127
cmsx6jw59000s3qnzrw0gwu7p	cmsvrrkzd000r07nztgeje1fl	image	/images/products/p3-a.jpg	Saira dusty rose court shoe	\N	1024	1024	0	2026-08-17 11:58:25.149
cmsx6jw5n000u3qnzwp04n8tb	cmsvrrl02000t07nzn23m5j0d	image	/images/products/p7-a.jpg	Everyday comfort sandal in tan leather	\N	1024	1280	0	2026-08-17 11:58:25.163
cmsx6jw66000w3qnzhem5yac3	cmsvrrl0f000v07nzf9t00b9y	image	/images/products/p8-a.jpg	Urban loafer in dark brown leather	\N	1024	1280	0	2026-08-17 11:58:25.182
cmsx6jw66000x3qnznpoc0zry	cmsvrrl0f000v07nzf9t00b9y	video	/videos/p10-look.mp4	Urban Leather Loafer — a slow look around the pair	/videos/p10-look-poster.jpg	\N	\N	1	2026-08-17 11:58:25.182
cmsx6jw6x000z3qnz44du6y4w	cmsvrrl18000y07nzh9o8blk6	image	/images/products/p9-a.jpg	Signature pointed flat in black leather	\N	1024	1280	0	2026-08-17 11:58:25.209
cmsx6jw7900113qnzxhbqa0no	cmsvrrl1y001007nzzhikx3fa	image	/images/products/p6-a.jpg	Classic leather chappal in tan	\N	1024	1024	0	2026-08-17 11:58:25.222
cmsx6jw7p00133qnzvqmj4nkd	cmsvrrl2g001207nzij4en5a1	image	/images/products/p10-a.jpg	Hana tan leather ankle boot, side view	\N	1024	1280	0	2026-08-17 11:58:25.238
cmsx6jw7q00143qnz2l3u755v	cmsvrrl2g001207nzij4en5a1	image	/images/products/p10-b.jpg	Hana ankle boot rear three-quarter view showing the heel	\N	1024	1280	1	2026-08-17 11:58:25.238
cmsx6jw7q00153qnz9om2gvyr	cmsvrrl2g001207nzij4en5a1	image	/images/products/p10-c.jpg	Close detail of the Hana boot stitching and leather grain	\N	1024	1280	2	2026-08-17 11:58:25.238
cmsx6jw7w00173qnz9h8gmxok	cmsvrrl2x001607nzoqh2ti8q	image	/images/products/p11-a.jpg	Atelier house slipper in charcoal felt	\N	1024	1280	0	2026-08-17 11:58:25.244
cmsx6jw8800193qnz9dzgb16d	cmsvrrl3f001807nzdfudfoiu	image	/images/products/p13-a.jpg	Leather care kit: neutral cream, horsehair brush and cloth	\N	1024	1280	0	2026-08-17 11:58:25.256
cmsx6jw8g001b3qnzu5n5bvwx	cmsvrrl4e001a07nzdobmmwyt	image	/images/products/p12-a.jpg	Rafi chukka boot in coffee brown leather	\N	1024	1280	0	2026-08-17 11:58:25.264
cmsx6jw8o001d3qnz2jrsxsy6	cmsvrrl4o001c07nzcq1c1xpp	image	/images/products/p14-a.jpg	Travel shoe bag in natural cotton canvas	\N	1024	1280	0	2026-08-17 11:58:25.272
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, slug, sku, "shortDescription", description, price, "salePrice", stock, "stockStatus", status, featured, "newArrival", "onSale", sizes, colors, tags, "seoTitle", "seoDescription", "categoryId", "brandId", "createdAt", "updatedAt") FROM stdin;
cmsvrrkyy000p07nzkqngngpn	Lina Everyday Slide	lina-everyday-slide	SHE-LIN-007	A featherweight slide with a moulded contour footbed.	The lightest thing we make. A single moulded footbed, a soft padded strap, and very little else — intended for the walk between the car and everywhere else.	3990	\N	0	out-of-stock	active	f	f	f	[{"value": "36", "available": true}, {"value": "38", "available": true}, {"value": "40", "available": true}]	[{"name": "Rose Beige", "swatch": "#E0C4B8", "available": true}, {"name": "Stone", "swatch": "#C9C6BD", "available": true}]	{}	\N	\N	cmsvrrkua000707nzv108qgal	cmsvrrkuk000807nz1gbqojzj	2026-08-16 12:16:43.498	2026-08-17 11:58:25.118
cmsvrrl02000t07nzn23m5j0d	Everyday Comfort Sandal	everyday-comfort-sandal	SHE-EVE-009	Wide crossover straps on a contoured, cushioned footbed.	Two wide straps cross the foot and are stitched — not glued — into a contoured cork-and-foam footbed that takes the shape of the wearer over the first week or so.	4590	\N	18	in-stock	active	t	f	f	[{"value": "36", "available": true}, {"value": "37", "available": true}, {"value": "38", "available": true}, {"value": "39", "available": true}, {"value": "40", "available": false}]	[{"name": "Tan", "swatch": "#B47B4A", "available": true}, {"name": "Blush", "swatch": "#D8A7A2", "available": true}]	{}	\N	\N	cmsvrrktz000207nz6400evuf	cmsvrrkuk000807nz1gbqojzj	2026-08-16 12:16:43.538	2026-08-17 11:58:25.152
cmsvrrkwx000f07nzn7orakrv	Meher Embroidered Flat	meher-embroidered-flat	ATL-MEH-002	Hand-embroidered vamp on soft suede with a whisper-thin sole.	Each Meher vamp is embroidered by hand in Lahore, which means no two pairs carry exactly the same stitch density. The base is a brushed suede chosen for how it takes thread; the sole is kept deliberately thin so the shoe folds and travels well. Expect small irregularities in the metallic work — they are the point.	5290	\N	3	low-stock	active	f	f	f	[{"value": "35", "available": true}, {"value": "36", "available": true}, {"value": "37", "available": true}, {"value": "38", "available": true}, {"value": "39", "available": true}, {"value": "40", "available": true}, {"value": "41", "available": false}]	[{"name": "Beige", "swatch": "#D9C6AC", "available": true}, {"name": "Charcoal", "swatch": "#3A3A38", "available": true}]	{}	\N	\N	cmsvrrktz000207nz6400evuf	cmsvrrkuz000a07nzlwpfzzza	2026-08-16 12:16:43.425	2026-08-17 11:58:25.035
cmsvrrkxk000h07nz19tgapf8	Noor Block Heel	noor-block-heel	SHE-NOO-003	A 60mm block heel balanced for all-day wear.	A court shoe built around the heel rather than the other way round. At 60mm the block sits directly under the ankle, which is what keeps it wearable from morning to evening. The topline is cut low at the sides and slightly higher at the back to stop slipping without gripping.	8990	7640	21	in-stock	active	t	f	t	[{"value": "36", "available": true}, {"value": "37", "available": true}, {"value": "38", "available": true}, {"value": "39", "available": true}, {"value": "40", "available": false}]	[{"name": "Dusty Rose", "swatch": "#D29E9E", "available": true}, {"name": "Black", "swatch": "#1C1A19", "available": true}]	{}	\N	\N	cmsvrrku1000307nzqhisktkl	cmsvrrkuk000807nz1gbqojzj	2026-08-16 12:16:43.448	2026-08-17 11:58:25.057
cmsvrrkxx000j07nzcrm821jd	Shahzad Oxford	shahzad-oxford	SHE-SHA-004	Goodyear-welted full grain leather with a hand-burnished toe.	A closed-lacing oxford in full-grain calf, Goodyear-welted so the sole can be replaced rather than the shoe discarded. The toe is burnished by hand, which deepens the colour unevenly on purpose — the finish will continue to move as the shoe is worn.	12490	\N	9	in-stock	active	t	f	f	[{"value": "39", "available": true}, {"value": "40", "available": true}, {"value": "41", "available": true}, {"value": "42", "available": true}, {"value": "43", "available": true}, {"value": "44", "available": false}, {"value": "45", "available": true}]	[{"name": "Chestnut", "swatch": "#6B4326", "available": true}, {"name": "Black Coffee", "swatch": "#2C231D", "available": true}]	{}	\N	\N	cmsvrrku5000507nzpyoefj9h	cmsvrrkuk000807nz1gbqojzj	2026-08-16 12:16:43.461	2026-08-17 11:58:25.072
cmsvrrkys000n07nz0mfh24tp	Peshawari Heritage	peshawari-heritage	ATL-PES-006	Double-sole construction, hand-stitched by third-generation artisans.	The Peshawari is made the way it has been made for decades: two soles stitched together by hand, a broad vegetable-tanned strap across the front, and nothing else. Because each pair is stitched individually, allow a little variation in strap width between sizes.	7290	\N	0	pre-order	active	f	f	f	[{"value": "7", "available": true}, {"value": "8", "available": true}, {"value": "9", "available": true}, {"value": "10", "available": true}, {"value": "11", "available": false}]	[{"name": "Tan", "swatch": "#B47B4A", "available": true}, {"name": "Dark Brown", "swatch": "#4A3427", "available": true}]	{}	\N	\N	cmsvrrku3000407nzohy7st28	cmsvrrkuz000a07nzlwpfzzza	2026-08-16 12:16:43.492	2026-08-17 11:58:25.098
cmsvrrkzd000r07nztgeje1fl	Saira Court Shoe	saira-court-shoe	SHE-SAI-008	A pointed almond toe on a slender 70mm heel.	An almond toe cut slightly longer than the foot, which is what gives the Saira its line. The 70mm heel is set marginally forward of the centre to shift weight off the ball of the foot.	10490	\N	6	in-stock	active	f	t	f	[{"value": "37", "available": true}, {"value": "38", "available": true}, {"value": "39", "available": true}]	[{"name": "Dusty Rose", "swatch": "#D29E9E", "available": true}]	{}	\N	\N	cmsvrrku1000307nzqhisktkl	cmsvrrkux000907nzd5x337dl	2026-08-16 12:16:43.513	2026-08-17 11:58:25.131
cmsvrrl2g001207nzij4en5a1	Hana Ankle Boot	hana-ankle-boot	SHE-HAN-013	A clean-lined ankle boot on a stacked block heel.	Cut high on the ankle with an inside zip and no external hardware. The block heel is stacked and slightly tapered so the boot reads lighter than it is. Offered in a single tan leather this season.	14900	11920	7	in-stock	active	t	t	t	[{"value": "36", "available": true}, {"value": "37", "available": true}, {"value": "38", "available": true}, {"value": "39", "available": true}, {"value": "40", "available": false}, {"value": "41", "available": true}]	[]	{}	\N	\N	cmsvrrku1000307nzqhisktkl	cmsvrrkux000907nzd5x337dl	2026-08-16 12:16:43.624	2026-08-17 12:53:25.196
cmsvrrl2x001607nzoqh2ti8q	Atelier House Slipper	atelier-house-slipper	ATL-HOU-014	One-size wool felt slipper with a suede sole.	A packable house slipper in dense wool felt with a thin suede sole. Made in one size that gives across the width rather than in a size run.	3490	\N	40	in-stock	active	f	f	f	[]	[{"name": "Charcoal", "swatch": "#3A3A38", "available": true}, {"name": "Oatmeal", "swatch": "#D9CFBE", "available": true}, {"name": "Deep Moss", "swatch": "#4A5443", "available": false}]	{}	\N	\N	cmsvrrkua000707nzv108qgal	cmsvrrkuz000a07nzlwpfzzza	2026-08-16 12:16:43.641	2026-08-17 12:56:17.57
cmsvrrl0f000v07nzf9t00b9y	Urban Leather Loafer	urban-leather-loafer	SHE-URB-010	A slim-profile loafer with minimal stitching and a flexible sole.	Cut close to the foot with an apron seam worked by hand and almost no visible hardware. The sole is thinner than a traditional loafer, which makes the shoe fold naturally at the ball of the foot from the first wear.	11290	9490	12	in-stock	active	f	t	t	[{"value": "40", "available": true}, {"value": "41", "available": true}, {"value": "42", "available": true}, {"value": "43", "available": false}, {"value": "44", "available": true}]	[{"name": "Dark Brown", "swatch": "#4A3427", "available": true}, {"name": "Black Coffee", "swatch": "#2C231D", "available": true}]	{}	\N	\N	cmsvrrku5000507nzpyoefj9h	cmsvrrkuk000807nz1gbqojzj	2026-08-16 12:16:43.551	2026-08-17 11:58:25.164
cmsvrrkvd000c07nz6h4f137i	Aurelia Bow Slide	aurelia-bow-slide	SHE-AUR-001	Softly knotted vamp with a gold ring detail and a cushioned quilted footbed.	The Aurelia takes the everyday slide somewhere quieter. The vamp is knotted by hand from a single piece of glove-soft nappa, then finished with a slim gold ring at the centre. Underneath, a quilted footbed is layered over a flexible sole so the shoe moves with the foot rather than against it. Wear it with linen in the afternoon and with something sharper after dark.	6490	4890	14	in-stock	active	t	t	t	[{"value": "36", "available": true}, {"value": "37", "available": true}, {"value": "38", "available": true}, {"value": "39", "available": false}, {"value": "40", "available": true}]	[{"name": "Blush", "swatch": "#D8A7A2", "available": true}, {"name": "Ivory", "swatch": "#F2EDE4", "available": true}, {"name": "Sand", "swatch": "#D9C6AC", "available": false}]	{bestseller,summer}	\N	\N	cmsvrrktz000207nz6400evuf	cmsvrrkux000907nzd5x337dl	2026-08-16 12:16:43.369	2026-08-17 11:58:24.985
cmsvrrl1y001007nzzhikx3fa	Classic Leather Chappal	classic-leather-chappal	ATL-CLA-012	An everyday chappal cut from vegetable-tanned leather.	Vegetable-tanned leather over a stitched sole. It starts stiff and pale and ends up soft and considerably darker — the leather is undyed, so it takes its final colour from wear.	6190	\N	25	in-stock	active	f	t	f	[{"value": "8", "available": true}, {"value": "9", "available": true}, {"value": "10", "available": true}, {"value": "11", "available": true}]	[{"name": "Tan", "swatch": "#B47B4A", "available": true}]	{}	\N	\N	cmsvrrku3000407nzohy7st28	cmsvrrkuz000a07nzlwpfzzza	2026-08-16 12:16:43.606	2026-08-17 11:58:25.21
cmsvrrl3f001807nzdfudfoiu	Leather Care Kit	shelina-care-kit	SHE-CAR-015	Cream, brush and cloth for finished and vegetable-tanned leather.	A neutral cream that works across the range, a horsehair brush, and a lint-free cloth. The cream is uncoloured so it will not shift the tone of undyed leather.	2250	\N	60	in-stock	active	f	f	f	[]	[]	{}	\N	\N	cmsvrrkua000707nzv108qgal	cmsvrrkuk000807nz1gbqojzj	2026-08-16 12:16:43.659	2026-08-17 11:58:25.248
cmsvrrl18000y07nzh9o8blk6	Signature Pointed Flat	signature-pointed-flat	SHE-SIG-011	A clean pointed toe with a subtle gold hardware accent.	A flat with the proportions of a court shoe. The toe is elongated, the topline scooped, and a small brushed-gold plate sits at the throat as the only ornament.	8290	\N	11	in-stock	active	t	t	f	[{"value": "36", "available": true}, {"value": "37", "available": true}, {"value": "38", "available": true}, {"value": "39", "available": true}]	[{"name": "Black", "swatch": "#1C1A19", "available": true}, {"name": "Ivory", "swatch": "#F2EDE4", "available": true}]	{}	\N	\N	cmsvrrku1000307nzqhisktkl	cmsvrrkux000907nzd5x337dl	2026-08-16 12:16:43.58	2026-08-17 11:58:25.186
cmsvrrl4e001a07nzdobmmwyt	Rafi Chukka Boot	rafi-chukka-boot	SHE-RAF-016	Two-eyelet chukka on a crepe sole.	A two-eyelet chukka in oiled coffee-brown calf on a natural crepe sole. The crepe is soft underfoot and grips well on smooth floors; it will pick up a patina at the edges.	13250	\N	2	low-stock	active	f	f	f	[{"value": "40", "available": true}, {"value": "41", "available": true}, {"value": "42", "available": true}, {"value": "43", "available": true}, {"value": "44", "available": true}]	[{"name": "Coffee", "swatch": "#4B3524", "available": true}]	{}	\N	\N	cmsvrrku5000507nzpyoefj9h	cmsvrrkuk000807nz1gbqojzj	2026-08-16 12:16:43.694	2026-08-17 11:58:25.258
cmsvrrl4o001c07nzcq1c1xpp	Travel Shoe Bag	travel-shoe-bag	SHE-TRV-017	Drawstring cotton canvas bag for one pair.	A plain drawstring bag in heavy cotton canvas, sized to hold a single pair without crushing the toe box. Small fits flats and slides, Medium fits most shoes, Large fits boots.	1650	\N	35	in-stock	active	f	f	f	[{"value": "Small", "available": true}, {"value": "Medium", "available": true}, {"value": "Large", "available": true}]	[{"name": "Natural", "swatch": "#E3DCCB", "available": true}, {"name": "Ink", "swatch": "#2A2E33", "available": true}]	{}	\N	\N	cmsvrrkua000707nzv108qgal	cmsvrrkuk000807nz1gbqojzj	2026-08-16 12:16:43.704	2026-08-17 12:56:35.736
cmsvrrkye000l07nz6kzbiqis	Drift Low Sneaker	drift-low-sneaker	SHA-DRI-005	Full-grain white leather upper on a lightweight cupsole.	A low sneaker stripped back to its outline: no logos, no contrast panels, no visible branding. The upper is one piece of full-grain leather over a foam-backed lining, sitting on a cupsole light enough to wear all day.	9750	8290	30	in-stock	active	f	t	t	[{"value": "UK 6", "available": true}, {"value": "UK 7", "available": true}, {"value": "UK 8", "available": true}, {"value": "UK 9", "available": false}, {"value": "UK 10", "available": true}]	[{"name": "Optic White", "swatch": "#F7F7F4", "available": true}, {"name": "Sky", "swatch": "#2596BE", "available": true}]	{}	\N	\N	cmsvrrku8000607nz3jootf4s	cmsvrrkv0000b07nztkyjghms	2026-08-16 12:16:43.478	2026-08-17 11:58:25.088
\.


--
-- Data for Name: seo_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_settings (id, "siteTitle", "siteDescription", "defaultImage", keywords, "ogTitle", "ogDescription", "ogImage", "twitterTitle", "twitterDescription", "twitterImage", "updatedAt") FROM stdin;
seo	Shelina	Handcrafted leather chappals, shoes and sneakers for women and men, made in Pakistan.	/images/hero/hero-main.jpg	{"leather chappals","ladies shoes","gents shoes",sneakers,Pakistan}	\N	\N	\N	\N	\N	\N	2026-08-17 12:55:01.331
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: customer_users customer_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_users
    ADD CONSTRAINT customer_users_pkey PRIMARY KEY (id);


--
-- Name: homepage homepage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homepage
    ADD CONSTRAINT homepage_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_media product_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT product_media_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: seo_settings seo_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_settings
    ADD CONSTRAINT seo_settings_pkey PRIMARY KEY (id);


--
-- Name: admin_users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX admin_users_email_key ON public.admin_users USING btree (email);


--
-- Name: banners_active_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "banners_active_sortOrder_idx" ON public.banners USING btree (active, "sortOrder");


--
-- Name: brands_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX brands_slug_key ON public.brands USING btree (slug);


--
-- Name: categories_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);


--
-- Name: customer_users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_users_email_key ON public.customer_users USING btree (email);


--
-- Name: order_items_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "order_items_orderId_idx" ON public.order_items USING btree ("orderId");


--
-- Name: order_items_productId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "order_items_productId_idx" ON public.order_items USING btree ("productId");


--
-- Name: orders_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "orders_createdAt_idx" ON public.orders USING btree ("createdAt");


--
-- Name: orders_customerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "orders_customerId_idx" ON public.orders USING btree ("customerId");


--
-- Name: orders_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "orders_idempotencyKey_key" ON public.orders USING btree ("idempotencyKey");


--
-- Name: orders_orderNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "orders_orderNumber_key" ON public.orders USING btree ("orderNumber");


--
-- Name: orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_status_idx ON public.orders USING btree (status);


--
-- Name: product_media_productId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "product_media_productId_sortOrder_idx" ON public.product_media USING btree ("productId", "sortOrder");


--
-- Name: products_brandId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "products_brandId_idx" ON public.products USING btree ("brandId");


--
-- Name: products_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "products_categoryId_idx" ON public.products USING btree ("categoryId");


--
-- Name: products_sku_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_sku_key ON public.products USING btree (sku);


--
-- Name: products_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_slug_key ON public.products USING btree (slug);


--
-- Name: products_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_status_idx ON public.products USING btree (status);


--
-- Name: banners banners_homepageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT "banners_homepageId_fkey" FOREIGN KEY ("homepageId") REFERENCES public.homepage(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customer_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_media product_media_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT "product_media_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: products products_brandId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES public.brands(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: products products_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict SWZttjcpiWLdUi7gFFjFj9c7fpHTsMSIM4EoWWCZwbcDNtMCWDgb7X2yyMc7sK8

