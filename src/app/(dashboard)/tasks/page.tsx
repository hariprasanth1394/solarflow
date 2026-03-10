import dynamic from "next/dynamic";

const TasksPage = dynamic(() => import("@/modules/tasks/TasksPage"));

export default function TasksRoutePage() {
  return <TasksPage />;
}