import { notFound } from "next/navigation";

/** The pose, jump, spin and step labs exist for visual checks and are not published. */
export default function DevLayout({ children }: LayoutProps<"/dev">) {
  if (process.env.NODE_ENV === "production" && process.env.SHOW_DEV_LABS !== "1") notFound();
  return <>{children}</>;
}
