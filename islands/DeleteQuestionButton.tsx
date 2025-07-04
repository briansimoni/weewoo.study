import { useState } from "preact/hooks";
import { Trash } from "lucide-preact";

export default function DeleteQuestionButton({ questionId }: { questionId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        globalThis.location.href = '/admin/questions?deleted=true';
      } else {
        const error = await response.json();
        alert(`Failed to delete question: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('An error occurred while deleting the question');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      class="btn btn-error"
      onClick={handleDelete}
      disabled={isDeleting}
      aria-busy={isDeleting}
    >
      <Trash className="w-4 h-4 mr-2" />
      {isDeleting ? 'Deleting...' : 'Delete Question'}
    </button>
  );
}
