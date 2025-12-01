import { AuthGuard } from "@/components/AuthGuard";
import { Dashboard } from "@/components/Dashboard";

const Index = () => {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
};

export default Index;
