import { getCurrentProfile } from "@/src/lib/auth";
import HomeNav from "@/app/home-next/HomeNav";
import { display } from "@/app/home-next/font";
import "@/app/home-next/home.css";

export default async function Navbar() {
  const profile = await getCurrentProfile();
  return <div className={`ared-home ared-site-nav ${display.variable}`}>
    <HomeNav signedIn={Boolean(profile)} variant="feed" />
  </div>;
}
