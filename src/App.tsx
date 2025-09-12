import CanvasArea from "@/components/CanvasArea/CanvasArea"
import Sidebar from "@/components/Sidebar/Sidebar"
import "./App.scss"

const App: React.FC = () => {
  return (
    <div className="app">
      <Sidebar />
      <CanvasArea />
    </div>
  )
}

export default App
