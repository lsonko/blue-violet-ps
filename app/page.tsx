import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppData } from "@/lib/data";
import App from "@/components/App";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getAppData(supabase, user.id);

  return (
    <App initialData={data} userId={user.id} userEmail={user.email ?? ""} />
  );
}
