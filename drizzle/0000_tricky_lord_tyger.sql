CREATE TABLE IF NOT EXISTS "channels" (
	"id" integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" integer PRIMARY KEY NOT NULL,
	"smelly" integer DEFAULT 0 NOT NULL
);
