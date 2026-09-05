CREATE TYPE "public"."banner_position" AS ENUM('hero', 'secondary', 'promo_bar');--> statement-breakpoint
CREATE TYPE "public"."cart_status" AS ENUM('active', 'converted', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('accrued', 'approved', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('retail', 'agent', 'reseller');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."group_preorder_status" AS ENUM('new', 'quoted', 'confirmed', 'paid', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('id', 'en');--> statement-breakpoint
CREATE TYPE "public"."order_channel" AS ENUM('online', 'in_store', 'group_preorder');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'settlement', 'expired', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('simple', 'variable', 'bundle');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('draft', 'requested', 'allocated', 'picking_up', 'picked', 'in_transit', 'delivered', 'returned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'staff', 'cashier', 'warehouse', 'cs', 'admin', 'owner');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"issuer" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_issuer_account_id_unique" UNIQUE("issuer","account_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"actor_label" text,
	"action" varchar(80) NOT NULL,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" varchar(40),
	"before" jsonb,
	"after" jsonb,
	"ip" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(80) NOT NULL,
	"phone" varchar(32),
	"address_line" text,
	"city" text,
	"province" text,
	"postal_code" varchar(10),
	"origin_area_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundle_items" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"bundle_product_id" varchar(30) NOT NULL,
	"variant_id" varchar(30) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "bundle_item_unique" UNIQUE("bundle_product_id","variant_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"parent_id" varchar(30),
	"name" text NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"image_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"product_id" varchar(30) NOT NULL,
	"url" text NOT NULL,
	"alt" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"product_id" varchar(30) NOT NULL,
	"sku" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"price_idr" integer NOT NULL,
	"compare_at_idr" integer,
	"weight_grams" integer NOT NULL,
	"length_cm" integer,
	"width_cm" integer,
	"height_cm" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" text NOT NULL,
	"category_id" varchar(30),
	"type" "product_type" DEFAULT 'simple' NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"short_description" text,
	"description" text,
	"story" text,
	"price_from" integer,
	"is_featured" boolean DEFAULT false NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"variant_id" varchar(30) NOT NULL,
	"location_id" varchar(30),
	"delta" integer NOT NULL,
	"reason" varchar(40) NOT NULL,
	"reference" varchar(60),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"customer_id" varchar(30) NOT NULL,
	"label" varchar(40),
	"recipient_name" text NOT NULL,
	"phone" varchar(32) NOT NULL,
	"province" text NOT NULL,
	"city" text NOT NULL,
	"district" text,
	"postal_code" varchar(10),
	"address_line" text NOT NULL,
	"area_id" text,
	"notes" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" text,
	"type" "customer_type" DEFAULT 'retail' NOT NULL,
	"price_tier_id" varchar(30),
	"company_name" text,
	"notes" text,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_spent_idr" integer DEFAULT 0 NOT NULL,
	"first_order_at" timestamp with time zone,
	"last_order_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "price_tiers" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" varchar(40) NOT NULL,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"min_order_value_idr" integer,
	"min_order_qty" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_tiers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"slug" varchar(180) NOT NULL,
	"locale" "locale" DEFAULT 'id' NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body" text DEFAULT '' NOT NULL,
	"cover_image_url" text,
	"author" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"meta_title" text,
	"meta_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_locale_unique" UNIQUE("slug","locale")
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"title" text,
	"image_url" text NOT NULL,
	"link_url" text,
	"position" "banner_position" DEFAULT 'hero' NOT NULL,
	"locale" "locale" DEFAULT 'id' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_pages" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"locale" "locale" DEFAULT 'id' NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_pages_slug_locale_unique" UNIQUE("slug","locale")
);
--> statement-breakpoint
CREATE TABLE "voucher_redemptions" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"voucher_id" varchar(30) NOT NULL,
	"order_id" varchar(30) NOT NULL,
	"customer_id" varchar(30),
	"amount_idr" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voucher_redemption_order_unique" UNIQUE("voucher_id","order_id")
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"description" text,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"min_order_value_idr" integer,
	"max_discount_idr" integer,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"per_customer_limit" integer DEFAULT 1 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vouchers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"tour_leader_id" varchar(30) NOT NULL,
	"order_id" varchar(30),
	"group_preorder_id" varchar(30),
	"base_amount_idr" integer NOT NULL,
	"commission_amount_idr" integer NOT NULL,
	"status" "commission_status" DEFAULT 'accrued' NOT NULL,
	"period" varchar(7) NOT NULL,
	"paid_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_preorder_items" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"group_preorder_id" varchar(30) NOT NULL,
	"variant_id" varchar(30),
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_idr" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "group_preorders" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"reference" varchar(20) NOT NULL,
	"status" "group_preorder_status" DEFAULT 'new' NOT NULL,
	"agent_name" text NOT NULL,
	"agent_phone" varchar(32) NOT NULL,
	"agent_email" text,
	"company_name" text,
	"arrival_date" date NOT NULL,
	"arrival_time" time,
	"headcount" integer NOT NULL,
	"bus_info" text,
	"package_notes" text,
	"estimated_value_idr" integer,
	"quote_order_id" varchar(30),
	"assigned_to" text,
	"tour_leader_id" varchar(30),
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_preorders_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "tour_leaders" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" varchar(32) NOT NULL,
	"agency_name" text,
	"referral_code" varchar(24) NOT NULL,
	"commission_type" "discount_type" DEFAULT 'percent' NOT NULL,
	"commission_value" integer DEFAULT 0 NOT NULL,
	"bank_name" varchar(60),
	"bank_account" varchar(40),
	"bank_holder" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_leaders_phone_unique" UNIQUE("phone"),
	CONSTRAINT "tour_leaders_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"cart_id" varchar(30) NOT NULL,
	"variant_id" varchar(30) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_item_unique" UNIQUE("cart_id","variant_id")
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"token" varchar(40) NOT NULL,
	"customer_id" varchar(30),
	"contact_phone" varchar(32),
	"contact_email" text,
	"status" "cart_status" DEFAULT 'active' NOT NULL,
	"locale" "locale" DEFAULT 'id' NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"order_id" varchar(30) NOT NULL,
	"status" "order_status" NOT NULL,
	"note" text,
	"actor_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"order_id" varchar(30) NOT NULL,
	"variant_id" varchar(30),
	"product_name" text NOT NULL,
	"variant_name" text NOT NULL,
	"sku" varchar(64) NOT NULL,
	"unit_price_idr" integer NOT NULL,
	"quantity" integer NOT NULL,
	"weight_grams" integer NOT NULL,
	"line_total_idr" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"order_number" varchar(24) NOT NULL,
	"customer_id" varchar(30) NOT NULL,
	"location_id" varchar(30),
	"channel" "order_channel" DEFAULT 'online' NOT NULL,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"currency" varchar(3) DEFAULT 'IDR' NOT NULL,
	"subtotal_idr" integer DEFAULT 0 NOT NULL,
	"discount_total_idr" integer DEFAULT 0 NOT NULL,
	"shipping_total_idr" integer DEFAULT 0 NOT NULL,
	"grand_total_idr" integer DEFAULT 0 NOT NULL,
	"voucher_id" varchar(30),
	"tour_leader_id" varchar(30),
	"shipping_selection" jsonb,
	"customer_note" text,
	"internal_note" text,
	"placed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"payment_id" varchar(30),
	"provider" varchar(20) DEFAULT 'midtrans' NOT NULL,
	"provider_ref" varchar(80) NOT NULL,
	"event_type" varchar(40) NOT NULL,
	"signature_valid" boolean NOT NULL,
	"dedupe_key" varchar(120) NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_event_dedupe_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"order_id" varchar(30) NOT NULL,
	"provider" varchar(20) DEFAULT 'midtrans' NOT NULL,
	"provider_ref" varchar(80) NOT NULL,
	"method" varchar(40),
	"amount_idr" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"snap_token" text,
	"snap_redirect_url" text,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_provider_ref_unique" UNIQUE("provider","provider_ref")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"payment_id" varchar(30) NOT NULL,
	"amount_idr" integer NOT NULL,
	"reason" text,
	"provider_ref" varchar(80),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_events" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"shipment_id" varchar(30) NOT NULL,
	"status" varchar(40) NOT NULL,
	"note" text,
	"event_time" timestamp with time zone,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"order_id" varchar(30) NOT NULL,
	"provider" varchar(20) DEFAULT 'biteship' NOT NULL,
	"provider_order_id" varchar(80),
	"courier_company" varchar(40),
	"courier_type" varchar(40),
	"tracking_number" varchar(60),
	"tracking_url" text,
	"status" "shipment_status" DEFAULT 'draft' NOT NULL,
	"weight_grams" integer DEFAULT 0 NOT NULL,
	"cost_idr" integer DEFAULT 0 NOT NULL,
	"origin_address" jsonb,
	"destination_address" jsonb,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"channel" varchar(20) NOT NULL,
	"template_key" varchar(60) NOT NULL,
	"recipient" varchar(160) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entity_type" varchar(40),
	"entity_id" varchar(30),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"provider_ref" varchar(120),
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_product_id_products_id_fk" FOREIGN KEY ("bundle_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_price_tier_id_price_tiers_id_fk" FOREIGN KEY ("price_tier_id") REFERENCES "public"."price_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_tour_leader_id_tour_leaders_id_fk" FOREIGN KEY ("tour_leader_id") REFERENCES "public"."tour_leaders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_preorder_items" ADD CONSTRAINT "group_preorder_items_group_preorder_id_group_preorders_id_fk" FOREIGN KEY ("group_preorder_id") REFERENCES "public"."group_preorders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_preorder_items" ADD CONSTRAINT "group_preorder_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_preorders" ADD CONSTRAINT "group_preorders_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_preorders" ADD CONSTRAINT "group_preorders_tour_leader_id_tour_leaders_id_fk" FOREIGN KEY ("tour_leader_id") REFERENCES "public"."tour_leaders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tour_leader_id_tour_leaders_id_fk" FOREIGN KEY ("tour_leader_id") REFERENCES "public"."tour_leaders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bundle_items_bundle_idx" ON "bundle_items" USING btree ("bundle_product_id");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "variants_product_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "products" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "stock_movements_variant_idx" ON "stock_movements" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "addresses_customer_idx" ON "addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customers_type_idx" ON "customers" USING btree ("type");--> statement-breakpoint
CREATE INDEX "banners_position_idx" ON "banners" USING btree ("position","locale");--> statement-breakpoint
CREATE INDEX "voucher_redemptions_customer_idx" ON "voucher_redemptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "vouchers_active_idx" ON "vouchers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "commissions_tl_period_idx" ON "commissions" USING btree ("tour_leader_id","period");--> statement-breakpoint
CREATE INDEX "commissions_status_idx" ON "commissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "group_preorder_items_parent_idx" ON "group_preorder_items" USING btree ("group_preorder_id");--> statement-breakpoint
CREATE INDEX "group_preorders_status_idx" ON "group_preorders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "group_preorders_arrival_idx" ON "group_preorders" USING btree ("arrival_date");--> statement-breakpoint
CREATE INDEX "carts_status_activity_idx" ON "carts" USING btree ("status","last_activity_at");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_placed_idx" ON "orders" USING btree ("placed_at");--> statement-breakpoint
CREATE INDEX "orders_channel_idx" ON "orders" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "payment_events_ref_idx" ON "payment_events" USING btree ("provider","provider_ref");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "refunds_payment_idx" ON "refunds" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "shipment_events_shipment_idx" ON "shipment_events" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "shipments_order_idx" ON "shipments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "shipments_tracking_idx" ON "shipments" USING btree ("tracking_number");--> statement-breakpoint
CREATE INDEX "shipments_status_idx" ON "shipments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_entity_idx" ON "notifications" USING btree ("entity_type","entity_id");