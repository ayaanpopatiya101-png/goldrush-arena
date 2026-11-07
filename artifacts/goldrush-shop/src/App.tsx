import { ErrorBoundary } from '@/components/error-boundary';
import Shop from '@/pages/Shop';

function App() {
  return (
    <ErrorBoundary resetKey="shop">
      <Shop />
    </ErrorBoundary>
  );
}

export default App;
