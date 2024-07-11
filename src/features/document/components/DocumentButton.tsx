import { File } from "lucide-react";
import Link from "next/link";

export default function DocumentButton() {
  return (
    <Link
      href={"/document"}
      className="absolute right-10 top-20 rounded-full border-2 border-emerald-900 bg-slate-100 p-4"
    >
      <File />
    </Link>
  );
}
