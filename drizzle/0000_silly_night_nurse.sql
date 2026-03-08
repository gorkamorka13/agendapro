CREATE TYPE "public"."AssignmentStatus" AS ENUM('PLANNED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."InvoiceStatus" AS ENUM('DRAFT', 'SENT', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('USER', 'ADMIN', 'VISITEUR');--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"phone" text,
	"hashedPassword" text,
	"image" text,
	"role" "Role" DEFAULT 'USER' NOT NULL,
	"hourlyRate" real,
	"travelCost" real,
	"color" text DEFAULT '#3b82f6',
	"fullName" text,
	CONSTRAINT "User_name_unique" UNIQUE("name"),
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "Account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" varchar(100) NOT NULL,
	"providerAccountId" varchar(100) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "VerificationToken" (
	"identifier" varchar(100) NOT NULL,
	"token" varchar(100) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "VerificationToken_identifier_token_pk" PRIMARY KEY("identifier","token"),
	CONSTRAINT "VerificationToken_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "Patient" (
	"id" serial PRIMARY KEY NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"address" text NOT NULL,
	"contactInfo" text
);
--> statement-breakpoint
CREATE TABLE "Appointment" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"location" text NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"userId" text NOT NULL,
	"status" "AssignmentStatus" DEFAULT 'PLANNED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Assignment" (
	"id" serial PRIMARY KEY NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"notes" text,
	"status" "AssignmentStatus" DEFAULT 'PLANNED' NOT NULL,
	"userId" text NOT NULL,
	"patientId" serial NOT NULL,
	"isRecurring" boolean DEFAULT false NOT NULL,
	"recurrenceId" text
);
--> statement-breakpoint
CREATE TABLE "WorkedHours" (
	"id" serial PRIMARY KEY NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"isPaid" boolean DEFAULT false NOT NULL,
	"assignmentId" serial NOT NULL,
	CONSTRAINT "WorkedHours_assignmentId_unique" UNIQUE("assignmentId")
);
--> statement-breakpoint
CREATE TABLE "Expense" (
	"id" serial PRIMARY KEY NOT NULL,
	"motif" text NOT NULL,
	"amount" real NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"recordingDate" timestamp DEFAULT now() NOT NULL,
	"receiptUrl" text,
	"userId" text
);
--> statement-breakpoint
CREATE TABLE "AiUsage" (
	"id" serial PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"promptTokens" integer NOT NULL,
	"candidatesTokens" integer NOT NULL,
	"totalTokens" integer NOT NULL,
	"feature" text DEFAULT 'OCR' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "InvoiceLineItem" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"quantity" real NOT NULL,
	"unitPrice" real NOT NULL,
	"total" real NOT NULL,
	"invoiceId" serial NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Invoice" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoiceNumber" text NOT NULL,
	"issueDate" timestamp NOT NULL,
	"dueDate" timestamp NOT NULL,
	"status" "InvoiceStatus" DEFAULT 'DRAFT' NOT NULL,
	"totalAmount" real NOT NULL,
	"patientId" serial NOT NULL,
	CONSTRAINT "Invoice_invoiceNumber_unique" UNIQUE("invoiceNumber")
);
--> statement-breakpoint
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_patientId_Patient_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WorkedHours" ADD CONSTRAINT "WorkedHours_assignmentId_Assignment_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."Assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_Invoice_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientId_Patient_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Appointment_userId_startTime_idx" ON "Appointment" USING btree ("userId","startTime");--> statement-breakpoint
CREATE INDEX "Appointment_startTime_endTime_idx" ON "Appointment" USING btree ("startTime","endTime");--> statement-breakpoint
CREATE INDEX "Assignment_userId_startTime_idx" ON "Assignment" USING btree ("userId","startTime");--> statement-breakpoint
CREATE INDEX "Assignment_patientId_startTime_idx" ON "Assignment" USING btree ("patientId","startTime");--> statement-breakpoint
CREATE INDEX "Assignment_startTime_endTime_idx" ON "Assignment" USING btree ("startTime","endTime");--> statement-breakpoint
CREATE INDEX "Assignment_status_idx" ON "Assignment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Expense_userId_date_idx" ON "Expense" USING btree ("userId","date");--> statement-breakpoint
CREATE INDEX "Expense_recordingDate_idx" ON "Expense" USING btree ("recordingDate");--> statement-breakpoint
CREATE INDEX "Expense_date_idx" ON "Expense" USING btree ("date");