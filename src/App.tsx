import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { DemoLabel } from './components/DemoLabel';
import { MedicMonitor } from './screens/MedicMonitor';
import { Phone } from './screens/Phone';
import { ReportMonitor } from './screens/ReportMonitor';
import { Spike } from './screens/Spike';

function Home() {
  return (
    <main className="home">
      <h1>Pinpoint showcase</h1>
      <p>The record that survives every handoff.</p>
      <nav>
        <Link to="/phone">/phone · field app</Link>
        <Link to="/monitor/medic">/monitor/medic · Offline Medic AI</Link>
        <Link to="/monitor/report">/monitor/report · Reporting</Link>
        <Link to="/spike">/spike · speech engine test (S25)</Link>
      </nav>
      <DemoLabel />
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/phone" element={<Phone />} />
      <Route path="/monitor/medic" element={<MedicMonitor />} />
      <Route path="/monitor/report" element={<ReportMonitor />} />
      <Route path="/spike" element={<Spike />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
