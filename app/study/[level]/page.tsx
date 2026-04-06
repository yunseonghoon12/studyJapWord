import { StudyLevelClient } from "./study-level-client";

export default async function StudyLevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
  return <StudyLevelClient level={level} />;
}
