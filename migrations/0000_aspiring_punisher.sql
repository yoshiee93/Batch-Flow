CREATE TYPE "public"."batch_status" AS ENUM('planned', 'in_progress', 'quality_check', 'completed', 'released', 'quarantined');--> statement-breakpoint
CREATE TYPE "public"."forecast_status" AS ENUM('Draft', 'Likely', 'Confirmed Forecast', 'Converted', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."label_type_enum" AS ENUM('raw_intake', 'finished_output', 'batch');--> statement-breakpoint
CREATE TYPE "public"."lot_status" AS ENUM('active', 'quarantined', 'released', 'consumed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."lot_testing_status" AS ENUM('not_required', 'pending', 'passed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."lot_type" AS ENUM('raw_material', 'intermediate', 'finished_good');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('receipt', 'production_input', 'production_output', 'adjustment', 'shipment');--> statement-breakpoint
CREATE TYPE "public"."order_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'in_production', 'ready', 'packed', 'partially_packed', 'shipped', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."quality_result" AS ENUM('pass', 'fail', 'pending');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('supplier', 'farmer', 'internal_batch');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'production', 'inventory', 'readonly');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar NOT NULL,
	"action" varchar(50) NOT NULL,
	"changes" text,
	"user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batch_materials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" varchar NOT NULL,
	"lot_id" varchar,
	"material_id" varchar,
	"product_id" varchar,
	"source_lot_id" varchar,
	"quantity" numeric(12, 3) NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"added_by" varchar
);
--> statement-breakpoint
CREATE TABLE "batch_outputs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"added_by" varchar
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_number" varchar(50) NOT NULL,
	"product_id" varchar NOT NULL,
	"recipe_id" varchar,
	"status" "batch_status" DEFAULT 'in_progress' NOT NULL,
	"planned_quantity" numeric(12, 3) NOT NULL,
	"actual_quantity" numeric(12, 3),
	"waste_quantity" numeric(12, 3),
	"milling_quantity" numeric(12, 3),
	"wet_quantity" numeric(12, 3),
	"start_date" timestamp,
	"end_date" timestamp,
	"assigned_to" varchar,
	"notes" text,
	"barcode_value" varchar(100),
	"barcode_printed_at" timestamp,
	"batch_code" varchar(20),
	"cleaning_time" numeric(10, 2),
	"number_of_staff" integer,
	"finish_time" timestamp,
	"product_assessment" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batches_batch_number_unique" UNIQUE("batch_number"),
	CONSTRAINT "batches_barcode_value_unique" UNIQUE("barcode_value"),
	CONSTRAINT "batches_batch_code_unique" UNIQUE("batch_code")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"exclude_from_yield" boolean DEFAULT false NOT NULL,
	"show_in_tabs" boolean DEFAULT true NOT NULL,
	"show_in_inventory" boolean DEFAULT true NOT NULL,
	"show_in_receive_stock" boolean DEFAULT true NOT NULL,
	"show_in_production_batch" boolean DEFAULT true NOT NULL,
	"show_in_production_inputs" boolean DEFAULT true NOT NULL,
	"show_in_production_outputs" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"process_code" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"default_label_template_id" varchar,
	"requires_testing" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "forecast_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"expected_date" timestamp NOT NULL,
	"notes" text,
	"confidence_level" text,
	"status" "forecast_status" DEFAULT 'Draft' NOT NULL,
	"converted_order_id" varchar,
	"converted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"label_type" "label_type_enum" NOT NULL,
	"customer_id" varchar,
	"is_default" boolean DEFAULT false NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_number" varchar(50) NOT NULL,
	"lot_type" "lot_type" DEFAULT 'raw_material' NOT NULL,
	"status" "lot_status" DEFAULT 'active' NOT NULL,
	"barcode_value" varchar(100),
	"material_id" varchar,
	"product_id" varchar,
	"supplier_lot" varchar(100),
	"supplier_name" text,
	"source_name" text,
	"source_type" "source_type",
	"original_quantity" numeric(12, 3),
	"quantity" numeric(12, 3) NOT NULL,
	"remaining_quantity" numeric(12, 3) NOT NULL,
	"expiry_date" timestamp,
	"received_date" timestamp DEFAULT now() NOT NULL,
	"produced_date" timestamp,
	"source_batch_id" varchar,
	"customer_id" varchar,
	"barcode_printed_at" timestamp,
	"notes" text,
	"product_temperature" numeric(5, 2),
	"visual_inspection" varchar(20),
	"received_by_id" varchar,
	"freight" text,
	"testing_status" "lot_testing_status" DEFAULT 'not_required' NOT NULL,
	"testing_notes" text,
	"testing_certificate" text,
	"tested_at" timestamp,
	"tested_by_id" varchar,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lots_lot_number_unique" UNIQUE("lot_number"),
	CONSTRAINT "lots_barcode_value_unique" UNIQUE("barcode_value")
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(50) DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit" varchar(10) DEFAULT 'KG' NOT NULL,
	"min_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"current_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"category_id" varchar,
	"is_receivable" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_allocations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"order_item_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"lot_id" varchar NOT NULL,
	"quantity_allocated" numeric(12, 3) NOT NULL,
	"packed_by" varchar,
	"packed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"reserved_quantity" numeric(12, 3) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"customer_id" varchar,
	"customer_name" text NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"priority" "order_priority" DEFAULT 'normal' NOT NULL,
	"due_date" timestamp NOT NULL,
	"notes" text,
	"po_number" varchar(100),
	"custom_batch_number" varchar(50),
	"freight" text,
	"shipped_at" timestamp,
	"shipping_carrier" text,
	"tracking_reference" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "print_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"printed_at" timestamp DEFAULT now() NOT NULL,
	"printed_by_user_id" varchar,
	"label_kind" text NOT NULL,
	"template_id" varchar,
	"template_name" text,
	"entity_type" text,
	"entity_id" varchar,
	"display_name" text NOT NULL,
	"secondary_name" text,
	"snapshot" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_code_definitions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "process_code_definitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" varchar(1) NOT NULL,
	"meaning" varchar(200) NOT NULL,
	CONSTRAINT "process_code_definitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(50) DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit" varchar(10) DEFAULT 'KG' NOT NULL,
	"min_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"current_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"category_id" varchar,
	"fruit_code" varchar(10),
	"is_receivable" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_checks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" varchar NOT NULL,
	"check_type" varchar(100) NOT NULL,
	"result" "quality_result" DEFAULT 'pending' NOT NULL,
	"value" text,
	"notes" text,
	"checked_by" varchar,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" varchar NOT NULL,
	"material_id" varchar NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"instructions" text,
	"output_quantity" numeric(12, 3) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movement_type" "movement_type" NOT NULL,
	"material_id" varchar,
	"product_id" varchar,
	"lot_id" varchar,
	"batch_id" varchar,
	"order_id" varchar,
	"quantity" numeric(12, 3) NOT NULL,
	"reference" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"customer_id" varchar,
	"is_default" boolean DEFAULT false NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "user_role" DEFAULT 'readonly' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_materials" ADD CONSTRAINT "batch_materials_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_materials" ADD CONSTRAINT "batch_materials_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_materials" ADD CONSTRAINT "batch_materials_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_materials" ADD CONSTRAINT "batch_materials_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_materials" ADD CONSTRAINT "batch_materials_source_lot_id_lots_id_fk" FOREIGN KEY ("source_lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_materials" ADD CONSTRAINT "batch_materials_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_outputs" ADD CONSTRAINT "batch_outputs_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_outputs" ADD CONSTRAINT "batch_outputs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_outputs" ADD CONSTRAINT "batch_outputs_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_orders" ADD CONSTRAINT "forecast_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_orders" ADD CONSTRAINT "forecast_orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_orders" ADD CONSTRAINT "forecast_orders_converted_order_id_orders_id_fk" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_templates" ADD CONSTRAINT "label_templates_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_received_by_id_users_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_tested_by_id_users_id_fk" FOREIGN KEY ("tested_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_allocations" ADD CONSTRAINT "order_item_allocations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_allocations" ADD CONSTRAINT "order_item_allocations_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_allocations" ADD CONSTRAINT "order_item_allocations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_allocations" ADD CONSTRAINT "order_item_allocations_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_allocations" ADD CONSTRAINT "order_item_allocations_packed_by_users_id_fk" FOREIGN KEY ("packed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_history" ADD CONSTRAINT "print_history_printed_by_user_id_users_id_fk" FOREIGN KEY ("printed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_checked_by_users_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "templates_kind_idx" ON "templates" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "templates_kind_customer_idx" ON "templates" USING btree ("kind","customer_id");