import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Note } from '@/types/expense';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function NotesSection() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user]);

  const loadNotes = async () => {
    if (!user) return;

    try {
      const notesRef = collection(db, 'users', user.uid, 'notes');
      const q = query(notesRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);

      const notesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Note[];

      setNotes(notesList);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newNoteTitle.trim()) return;

    try {
      const notesRef = collection(db, 'users', user.uid, 'notes');
      await addDoc(notesRef, {
        title: newNoteTitle.trim(),
        done: false,
        order: notes.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNewNoteTitle('');
      loadNotes();
      toast.success('Note added');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  const handleToggleDone = async (note: Note) => {
    if (!user) return;

    try {
      const noteRef = doc(db, 'users', user.uid, 'notes', note.id);
      await updateDoc(noteRef, {
        done: !note.done,
        updatedAt: serverTimestamp(),
      });

      loadNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return;

    try {
      const noteRef = doc(db, 'users', user.uid, 'notes', noteId);
      await deleteDoc(noteRef);
      loadNotes();
      toast.success('Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Things to Buy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Things to Buy</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
          <Input
            placeholder="Add a new item..."
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newNoteTitle.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {notes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No items yet. Add your first item!
          </p>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-smooth group"
              >
                <Checkbox
                  checked={note.done}
                  onCheckedChange={() => handleToggleDone(note)}
                  id={`note-${note.id}`}
                />
                <label
                  htmlFor={`note-${note.id}`}
                  className={`flex-1 cursor-pointer ${
                    note.done ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {note.title}
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteNote(note.id)}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-smooth"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
