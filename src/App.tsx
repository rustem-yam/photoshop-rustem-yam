import CanvasArea from "@/components/CanvasArea/CanvasArea"
import Sidebar from "@/components/Sidebar/Sidebar"
import "./App.scss"
import { useState } from "react"

const App: React.FC = () => {
  const [hasImage, setHasImage] = useState(false)

  return (
    <div className="app">
      <Sidebar hasImage={hasImage} />
      <CanvasArea onImageChange={setHasImage} />
    </div>
  )
}

export default App
