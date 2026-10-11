import AdminQuestionGenerator from "../../islands/AdminQuestionGenerator.tsx";
import { AdminPage } from "../../components/admin/AdminPage.tsx";

export default function QuestionGenerator() {
  return (
    <AdminPage
      title="Question generator"
      section="generator"
      width="narrow"
      description="Draft questions from a textbook chapter, review them, and save the ones worth keeping."
    >
      <AdminQuestionGenerator />
    </AdminPage>
  );
}
