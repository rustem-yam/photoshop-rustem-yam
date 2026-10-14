import React, { useState, useRef } from "react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Box,
  Typography,
  IconButton,
  Button,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  useMediaQuery,
} from "@mui/material"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ColorLens as ColorIcon,
  Image as ImageIcon,
  DragIndicator as DragIcon,
} from "@mui/icons-material"
import type { Layer, LayersState, BlendMode } from "../../types/layers"
import { BLEND_MODES } from "../../types/layers"
import {
  createLayerFromImage,
  createLayerFromColor,
  createLayerPreview,
  withLayerImage,
} from "../../utils/layerUtils"
import "./LayersPanel.scss"

interface LayersPanelProps {
  layersState: LayersState
  onLayersStateChange: (state: LayersState) => void
  imageSize?: { width: number; height: number }
}

interface SortableLayerItemProps {
  layer: Layer
  isActive: boolean
  onSetActive: (layerId: string) => void
  onToggleVisibility: (layerId: string) => void
  onDelete: (layerId: string) => void
  onOpacityChange: (layerId: string, opacity: number) => void
  onBlendModeChange: (layerId: string, blendMode: BlendMode) => void
  onToggleAlphaVisibility: (layerId: string) => void
  onDeleteAlpha: (layerId: string) => void
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({
  layer,
  isActive,
  onSetActive,
  onToggleVisibility,
  onDelete,
  onOpacityChange,
  onBlendModeChange,
  onToggleAlphaVisibility,
  onDeleteAlpha,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: layer.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      className={`layer-item ${isActive ? "active" : ""}`}
      onClick={() => onSetActive(layer.id)}
    >
      <Box className="drag-handle" {...attributes} {...listeners}>
        <DragIcon />
      </Box>

      <Box className="layer-preview">
        <img src={layer.preview} alt={layer.name} />
      </Box>

      {layer.alpha && (
        <Box className="alpha-mini" onClick={(e) => e.stopPropagation()}>
          <img src={layer.alpha.preview} alt={`${layer.name} alpha`} />
          <Box className="alpha-mini-actions">
            <IconButton size="small" onClick={() => onToggleAlphaVisibility(layer.id)}>
              {layer.alpha.visible ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
            </IconButton>
            <IconButton size="small" onClick={() => onDeleteAlpha(layer.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}

      <ListItemText
        primary={layer.name}
        // В secondary лежат Select и Slider (div), поэтому обёртка — div, а не p
        slotProps={{ secondary: { component: "div" } }}
        secondary={
          <Box className="layer-controls">
            <FormControl size="small" className="blend-mode-select">
              <Select
                value={layer.blendMode}
                onChange={(e) => onBlendModeChange(layer.id, e.target.value as BlendMode)}
                onClick={(e) => e.stopPropagation()}
              >
                {Object.entries(BLEND_MODES).map(([mode, info]) => (
                  <MenuItem key={mode} value={mode} title={info.description}>
                    {info.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box className="opacity-control">
              <Typography variant="caption">Непрозрачность:</Typography>
              <Slider
                value={layer.opacity}
                onChange={(_, value) => onOpacityChange(layer.id, value as number)}
                min={0}
                max={1}
                step={0.01}
                size="small"
                onClick={(e) => e.stopPropagation()}
              />
              <Typography variant="caption">{Math.round(layer.opacity * 100)}%</Typography>
            </Box>
          </Box>
        }
      />

      <ListItemSecondaryAction>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisibility(layer.id)
          }}
        >
          {layer.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(layer.id)
          }}
        >
          <DeleteIcon />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  )
}

const LayersPanel: React.FC<LayersPanelProps> = ({ layersState, onLayersStateChange, imageSize }) => {
  const [addLayerDialogOpen, setAddLayerDialogOpen] = useState(false)
  const isPhone = useMediaQuery("(max-width: 600px)")
  const [newLayerName, setNewLayerName] = useState("")

  const [selectedColor, setSelectedColor] = useState("#000000")
  const [layerType, setLayerType] = useState<"image" | "color">("image")
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // В списке верхний слой показывается первым, как в Photoshop
  const displayLayers = [...layersState.layers].reverse()

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = layersState.layers.findIndex((layer) => layer.id === active.id)
      const newIndex = layersState.layers.findIndex((layer) => layer.id === over.id)

      const newLayers = arrayMove(layersState.layers, oldIndex, newIndex)

      const updatedState: LayersState = {
        ...layersState,
        layers: newLayers,
      }
      onLayersStateChange(updatedState)
    }
  }

  const handleAddLayer = async () => {
    if (!newLayerName.trim()) return

    try {
      let newLayer: Layer

      if (layerType === "image" && selectedImageFile) {
        newLayer = await createLayerFromImage(selectedImageFile, newLayerName)
      } else if (layerType === "color") {
        const width = imageSize?.width || layersState.layers[0]?.imageData.width || 100
        const height = imageSize?.height || layersState.layers[0]?.imageData.height || 100
        newLayer = createLayerFromColor(selectedColor, newLayerName, width, height)
      } else {
        return
      }

      const updatedState: LayersState = {
        ...layersState,
        layers: [...layersState.layers, newLayer],
        activeLayerId: newLayer.id,
      }

      onLayersStateChange(updatedState)
      setAddLayerDialogOpen(false)
      setNewLayerName("")
      setSelectedImageFile(null)
    } catch (error) {
      console.error("Ошибка при создании слоя:", error)
    }
  }

  const handleDeleteLayer = (layerId: string) => {
    const updatedState: LayersState = {
      ...layersState,
      layers: layersState.layers.filter((layer) => layer.id !== layerId),
      activeLayerId: layersState.activeLayerId === layerId ? null : layersState.activeLayerId,
    }
    onLayersStateChange(updatedState)
  }

  // Удаление альфа-канала: слой становится полностью непрозрачным
  const handleDeleteAlpha = (layerId: string) => {
    const updatedState: LayersState = {
      ...layersState,
      layers: layersState.layers.map((layer) => {
        if (layer.id !== layerId) return layer
        const opaque = new ImageData(new Uint8ClampedArray(layer.imageData.data), layer.imageData.width)
        for (let i = 3; i < opaque.data.length; i += 4) opaque.data[i] = 255
        return withLayerImage(layer, opaque)
      }),
    }
    onLayersStateChange(updatedState)
  }

  const handleToggleAlphaVisibility = (layerId: string) => {
    const updatedState: LayersState = {
      ...layersState,
      layers: layersState.layers.map((layer) => {
        if (layer.id !== layerId || !layer.alpha) return layer
        const updated = { ...layer, alpha: { ...layer.alpha, visible: !layer.alpha.visible } }
        return { ...updated, preview: createLayerPreview(updated) }
      }),
    }
    onLayersStateChange(updatedState)
  }

  const handleToggleLayerVisibility = (layerId: string) => {
    const updatedState: LayersState = {
      ...layersState,
      layers: layersState.layers.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer)),
    }
    onLayersStateChange(updatedState)
  }

  const handleLayerOpacityChange = (layerId: string, opacity: number) => {
    const updatedState: LayersState = {
      ...layersState,
      layers: layersState.layers.map((layer) => (layer.id === layerId ? { ...layer, opacity } : layer)),
    }
    onLayersStateChange(updatedState)
  }

  const handleLayerBlendModeChange = (layerId: string, blendMode: BlendMode) => {
    const updatedState: LayersState = {
      ...layersState,
      layers: layersState.layers.map((layer) => (layer.id === layerId ? { ...layer, blendMode } : layer)),
    }
    onLayersStateChange(updatedState)
  }

  const handleSetActiveLayer = (layerId: string) => {
    const updatedState: LayersState = {
      ...layersState,
      activeLayerId: layerId,
    }
    onLayersStateChange(updatedState)
  }

  return (
    <Box className="layers-panel">
      <Typography variant="h6" className="layers-title">
        Слои
      </Typography>

      {/* Слои */}
      <Box className="layers-section">
        <Box className="section-header">
          <Typography variant="subtitle1">Слои ({layersState.layers.length}/2)</Typography>
            <IconButton
              size="small"
              onClick={() => setAddLayerDialogOpen(true)}
              disabled={layersState.layers.length >= 2}
              title="Добавить слой"
            >
              <AddIcon />
            </IconButton>
        </Box>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayLayers.map((layer) => layer.id)} strategy={verticalListSortingStrategy}>
            <List dense className="layers-list">
              {displayLayers.map((layer) => (
                <SortableLayerItem
                  key={layer.id}
                  layer={layer}
                  isActive={layersState.activeLayerId === layer.id}
                  onSetActive={handleSetActiveLayer}
                  onToggleVisibility={handleToggleLayerVisibility}
                  onDelete={handleDeleteLayer}
                  onOpacityChange={handleLayerOpacityChange}
                  onBlendModeChange={handleLayerBlendModeChange}
                  onToggleAlphaVisibility={handleToggleAlphaVisibility}
                  onDeleteAlpha={handleDeleteAlpha}
                />
              ))}
            </List>
          </SortableContext>
        </DndContext>
      </Box>

      <Divider />

      <Dialog
        open={addLayerDialogOpen}
        onClose={() => setAddLayerDialogOpen(false)}
        fullScreen={isPhone}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Добавить слой</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название слоя"
            value={newLayerName}
            onChange={(e) => setNewLayerName(e.target.value)}
            margin="normal"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Тип слоя</InputLabel>
            <Select value={layerType} onChange={(e) => setLayerType(e.target.value as "image" | "color")}>
              <MenuItem value="image">
                <ImageIcon /> Изображение
              </MenuItem>
              <MenuItem value="color">
                <ColorIcon /> Цвет
              </MenuItem>
            </Select>
          </FormControl>

          {layerType === "image" && (
            <Box margin="normal">
              <Button
                variant="outlined"
                startIcon={<ImageIcon />}
                fullWidth
                onClick={() => {
                  imageInputRef.current?.click()
                }}
              >
                Выбрать изображение
              </Button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*,.gb7"
                style={{ display: "none" }}
                onChange={() => {
                  const file = imageInputRef.current?.files?.[0] || null
                  setSelectedImageFile(file)
                }}
              />
            </Box>
          )}

          {layerType === "color" && (
            <Box margin="normal">
              <Typography variant="subtitle2">Выберите цвет:</Typography>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                style={{ width: "100%", height: "40px" }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddLayerDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={() => handleAddLayer()}
            variant="contained"
            disabled={
              !newLayerName.trim() || (layerType === "image" && !selectedImageFile) || layersState.layers.length >= 2
            }
          >
            Добавить
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  )
}

export default LayersPanel
