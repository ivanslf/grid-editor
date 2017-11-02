const BASE = 24

const editor = document.getElementById('editor')
var model = [
  {
    component_id: 1,
    type: 'image',
    size: 9
  },
  {
    component_id: 2,
    type: 'text',
    size: 15
  },
  {
    component_id: 3,
    type: 'text',
    size: 15
  },
  {
    component_id: 4,
    type: 'image',
    size: 9
  },
  {
    component_id: 5,
    type: 'image',
    size: 9
  },
  {
    component_id: 6,
    type: 'text',
    size: 15
  }
]

function getModel (element) { return model[parseInt(element.dataset.index)] }
function getLabel (type) { return type }

initialize()
function initialize () {
  editor.childNodes.forEach(function (_) { _.remove() })
  
  var size = 0
  var row
  for (const [index, component] of model.entries()) {
    if (!size) {
      row = createRow()
      editor.appendChild(row)
    }
    
    const element = document.createElement('div')
    element.className = 'component'
    element.id = 'component-' + index
    element.dataset.index = index
    element.style.flexGrow = component.size
    reorderEvent(element)
    row.appendChild(element)
    
    size += component.size
    if (size >= BASE) {
      size = 0
    }
  }
  drawSplitters()
  drawLabels()
  drawFractions()
}

function createRow () {
  const row = document.createElement('div')
  row.className = 'row'
  rowEvent(row)
  return row
}

function drawSplitters () {
  var splitters = editor.querySelectorAll('.splitter')
  splitters.forEach(function (_) { _.remove() })
  
  for (const row of editor.childNodes) {
    const components = Array.from(row.childNodes)
    for (const component of components) {
      if (component.previousSibling) {
        const splitter = document.createElement('div')
        splitter.className = 'splitter'
        resizeEvent(splitter)
        row.insertBefore(splitter, component)
      }
    }
  }
}

function drawLabels () {
  var labels = editor.querySelectorAll('.label')
  labels.forEach(function (_) { _.remove() })
  
  const components = editor.querySelectorAll('.component, .placeholder')
  for (const component of components) {
    const label = document.createElement('div')
    label.className = 'label'
    label.innerText = getLabel(getModel(component).type)
    component.appendChild(label)
  }
}

function drawFractions () {
  var fractions = editor.querySelectorAll('.fraction')
  fractions.forEach(function (_) { _.remove() })
  
  const components = editor.querySelectorAll('.component, .placeholder')
  for (const component of components) {
    const fraction = document.createElement('div')
    fraction.className = 'fraction'
    fraction.innerText = reduce(getModel(component).size + '/' + BASE)
    component.appendChild(fraction)
  }
}

function resizeEvent (element) {
  element.addEventListener('mousedown', function (event) {
    editor.classList.add('resizing')
    element.dataset.x = event.clientX
    element.dataset.left = element.previousSibling.style.flexGrow
    element.dataset.right = element.nextSibling.style.flexGrow
  })
  window.addEventListener('mouseup', function (event) {
    editor.classList.remove('resizing')
    element.dataset.x = null
  })
  window.addEventListener('mousemove', function (event) {
    var x = parseInt(element.dataset.x)
    if (!x || event.buttons !== 1) { return false }
    var left = parseInt(element.dataset.left)
    var right = parseInt(element.dataset.right)
    var style = window.getComputedStyle(element.parentNode, null)
    var width = parseInt(style.getPropertyValue('width'))
    var delta = Math.floor((x - event.clientX) / (width / BASE))
    if (left - delta > 0 && right + delta > 0) {
      resizeComponent(element.previousSibling, left - delta)
      resizeComponent(element.nextSibling, right + delta)
      drawFractions()
    }
  })
}

function reorderEvent (element) {
  element.draggable = true
  element.addEventListener('dragstart', function (event) {
    event.dataTransfer.setData('text/plain', element.id)
    setTimeout(function () { element.className = 'placeholder' })
  })
  element.addEventListener('dragend', function (event) {
    element.className = 'component'
    updateModel()
  })
  element.addEventListener('dragover', function (event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    
    const dragging = document.getElementById(event.dataTransfer.getData('text'))
    const dropzone = element.getBoundingClientRect()
    const center = dropzone.left + dropzone.width / 2
    
    if (event.clientX < center) {
      element.parentNode.insertBefore(dragging, element)
    } else {
      element.parentNode.insertBefore(dragging, element.nextSibling)
    }
    
    adjustRows()
    drawSplitters()
  })
  element.addEventListener('drop', function (event) {
    event.preventDefault()
  })
}

function rowEvent (element) {
  element.addEventListener('dragover', function (event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    
    var move
    const dropzone = element.getBoundingClientRect()
    const style = window.getComputedStyle(element, null)
    const top = dropzone.top + parseInt(style.getPropertyValue('padding-top'))
    const bottom = dropzone.bottom - parseInt(style.getPropertyValue('padding-bottom'))
    
    if (event.clientY < top) { move = 'up' }
    if (event.clientY > bottom) { move = 'down' }
    
    if (move) {
      const dragging = document.getElementById(event.dataTransfer.getData('text'))
      const row = createRow()
      editor.insertBefore(row, move === 'up' ? element : element.nextSibling)
      row.appendChild(dragging)
      
      adjustRows()
      drawSplitters()
    }
  })
  element.addEventListener('drop', function (event) {
    event.preventDefault()
  })
}

function resizeComponent (element, size) {
  element.style.flexGrow = getModel(element).size = parseInt(size)
}

function adjustRows () {
  for (const row of editor.childNodes) {
    if (row.childNodes.length === 0) { row.remove() }
    
    var rowSize = getRowSize(row)
    if (rowSize !== BASE) {
      const components = row.querySelectorAll('.component, .placeholder')
      for (const component of components) {
        const size = getModel(component).size
        const newSize = Math.round(size * BASE / rowSize)
        resizeComponent(component, newSize)
      }
      
      rowSize = getRowSize(row)
      if (rowSize !== BASE) {
        const component = row.querySelector('.component')
        if (!component) { continue }
        resizeComponent(component, getModel(component).size + (BASE - rowSize))
      }
    }
  }
  drawFractions()
}

function getRowSize (row) {
  const components = row.querySelectorAll('.component, .placeholder')
  return Array.from(components).reduce(function (a, b) {
    return a + getModel(b).size
  }, 0)
}

function updateModel () {
  const components = editor.querySelectorAll('.component')
  const newModel = []
  for (const [newIndex, component] of components.entries()) {
    const oldIndex = parseInt(component.dataset.index)
    newModel[newIndex] = model[oldIndex]
    component.dataset.index = newIndex
  }
  model = newModel
  debug()
}

function reduce (fraction) {
  const [top, bottom] = fraction.split('/')
  const gcd = GCD(top, bottom)
  return (top / gcd) + '/' + (bottom / gcd)
}

function GCD (a, b) {
  while (b) {
    const c = b
    b = a % b
    a = c
  }
  return a
}

debug()
function debug () {
  document.getElementById('debug').innerHTML = JSON.stringify(model)
}
