import { notFound } from "next/navigation";
import SkillView from "../../components/SkillView";
import { SKILLS, getSkill } from "../../../lib/skills";

export function generateStaticParams() {
  return SKILLS.map((s) => ({ id: s.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const s = getSkill(id);
  return { title: s ? `${s.name} · Skills · Faheem AI` : "Skill nahi mili" };
}

export default async function SkillPage({ params }) {
  const { id } = await params;
  const s = getSkill(id);
  if (!s) notFound();
  return <SkillView skill={s} />;
}
