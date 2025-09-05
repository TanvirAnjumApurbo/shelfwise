ALTER TABLE "books" ALTER COLUMN "rating" SET DATA TYPE numeric(3, 1);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "publisher" varchar(255);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "publication_date" date;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "edition" varchar(100);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "language" varchar(50);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "print_length" integer;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "book_type" varchar(20);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "isbn" varchar(20);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "item_weight" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "dimensions" varchar(50);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "about_author" text;