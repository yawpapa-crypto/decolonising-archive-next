import { authPhotos } from "@/lib/home/for-you";
import CollageClient from "./CollageClient";

export default async function EditorialCollage({ variant = "signin" }: { variant?: "signup" | "signin" }) {
  const photos = await authPhotos(variant);
  return <CollageClient photos={photos} />;
}
