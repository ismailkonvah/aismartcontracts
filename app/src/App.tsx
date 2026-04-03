import { Toaster } from '@/components/ui/sonner';
import { SmartContractAuditor } from '@/components/auditor/SmartContractAuditor';
import './App.css';

function App() {
  return (
    <>
      <SmartContractAuditor />
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
          },
        }}
      />
    </>
  );
}

export default App;
