import CanvasArea from "@/components/CanvasArea/CanvasArea"
import Sidebar from "@/components/Sidebar/Sidebar"
import "./App.scss"
import { useState } from "react"
import type { ToolType } from "@/types/tools"

const App: React.FC = () => {
  const [hasImage, setHasImage] = useState(false)
  const [activeTool, setActiveTool] = useState<ToolType>("none")

  const handleToolChange = (tool: ToolType) => {
    setActiveTool(tool)
  }

  return (
    <div className="app">
      <Sidebar hasImage={hasImage} activeTool={activeTool} onToolSelect={handleToolChange} />
      <CanvasArea onImageChange={setHasImage} onToolChange={handleToolChange} activeTool={activeTool} />
    </div>
  )
}

export default App
