import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { EventCreatePage } from './pages/EventCreatePage'
import { EventDetailPage } from './pages/EventDetailPage'
import { EventsPage } from './pages/EventsPage'
import { ChannelPage } from './pages/ChannelPage'
import { HomePage } from './pages/HomePage'
import { MePage } from './pages/MePage'
import { PlanCreatePage } from './pages/PlanCreatePage'
import { PlanDetailPage } from './pages/PlanDetailPage'
import { PlansPage } from './pages/PlansPage'
import { RafinePage } from './pages/RafinePage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/plans/new" element={<PlanCreatePage />} />
        <Route path="/plans/:id/edit" element={<PlanCreatePage />} />
        <Route path="/plans/:id" element={<PlanDetailPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/channel" element={<ChannelPage />} />
        <Route path="/events/new" element={<EventCreatePage />} />
        <Route path="/events/:id/edit" element={<EventCreatePage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/rafine" element={<RafinePage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  )
}

export default App
