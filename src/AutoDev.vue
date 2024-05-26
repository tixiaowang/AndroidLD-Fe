<template>

  <el-row :gutter="10" style="padding-left: 20px">
    <el-col :span="6">
      <el-space direction="vertical" alignment="start" style="margin-top: 20px">

        <el-text size="small">{{ `坐标: ${mouseX},${mouseY}` }}</el-text>
        <div ref="refDumpImg" style="position: relative">
          <el-image v-if="png" :style="{width: imgWidth + 'px',position: 'absolute'}" :src="png"
                    @mousemove="getMousePosition"
                    @dblclick="copyToClipboard(`${mouseX}, ${mouseY}`)"
                    @click="confirmSolidBorder">

          </el-image>
          <div v-if="rectBorderStyle" :style="rectBorderStyle"/>
          <div v-if="xuRectBorderStyle" :style="xuRectBorderStyle"/>
        </div>
      </el-space>
    </el-col>

    <el-col :span="18">
      <el-space style="width: 100%">

        <el-button :icon="Refresh" @click="refreshDump">刷新</el-button>
        <el-row style="width: 120px">
          <el-text v-if="time" size="small">最后抓取时间</el-text>
          <el-text v-if="time" size="small">{{
              new Date(time).toLocaleString()
            }}
          </el-text>
        </el-row>
        <el-switch v-model="dumpToggle" active-text="抓取手机页面" @click="switchDumpToggle('change')"/>
        <el-button :icon="Download" @click="capturePic">截取图片</el-button>
      </el-space>
      <el-scrollbar style="margin-top: 5px">
        <el-text> 当前页面名:</el-text>

        <el-button link @click="copyToClipboard(activity)">{{ activity }}</el-button>

        <el-tree ref="refTree" :expand-on-click-node="false" :check-on-click-node="true"
                 style="max-height: 90vh;display: flex"
                 node-key="id" v-if="uix.length" :data="uix" @node-click="handleNodeClick"
                 default-expand-all highlight-current
                 :props="{children: 'node', label: 'label',class: 'custom-tree-node'}"
                 :render-content="renderContent"
        />
      </el-scrollbar>
    </el-col>
  </el-row>


</template>


<script setup lang="ts">
import {computed, ref, onUnmounted, onMounted, watch} from 'vue'
import axios from 'axios';
import {Refresh, ArrowLeft, Delete, Download, Plus} from '@element-plus/icons-vue'

import {ElMessage, ElNotification} from 'element-plus'

const composeActionLoading = ref(false)
const currStatementIndex = ref(-1)
const currStatementIndexInner = ref(-1)
const defineActivity = ref(false)
const imgWidth = ref(280.0)
const refTree = ref(null)
const refDumpImg = ref(null)
const png = ref("")
const uix = ref([])
const time = ref(0)
const activity = ref('')

onMounted(() => {
  watch(currStatementIndex, () => {
    setTimeout(() => {
      let element = document.querySelector(`.class_statement_${currStatementIndex.value}_0 input`);
      element && element.focus()
    }, 100)
  })
})

const statementOptions = ref([
  {
    name: '',
    args: [],
    args_count: 0,
    args_hint: [],
    child_enable: false,
    child: [],
  }
])

const onImgChange = (rawFile, statement, argIndex) => {
  if (!rawFile.raw.type.startsWith('image')) {
    ElMessage.error('只能选择图片')
    return
  } else if (rawFile.raw.size / 1024 > 50) {
    ElMessage.error('图片大小不能超过50Kb')
    return
  }
  var reader = new FileReader();
  reader.onloadend = () => {
    statement.args[argIndex] = reader.result
    console.log(reader.result)
  }
  reader.readAsDataURL(rawFile.raw);
}


const feActionForm = ref(null)

onUnmounted(() => {
  if (dumpToggle.value) {
    switchDumpToggle('change')
  }
})

const currBorderRect = ref([])
const xuCurrBorderRect = ref([])
const xuCurrNodeId = ref(-1)
const currSelectNode = computed(() => refTree.value && refTree.value.getCurrentNode())

const currSelectResourceIdSameCount = computed(() => {
  if (currSelectNode.value && currSelectNode.value['resource-id']) {
    const arr = []
    findNodesByResourceId(arr, uix.value)
    return arr.length
  } else {
    return 0
  }

})

const copyToClipboard = (str) => {
  try {
    if (str) {
      const textArea = document.createElement("textarea");
      textArea.value = str;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      ElMessage({
        message: "复制成功 " + str,
        type: 'success',
      })
    }
  } catch (error) {
    console.log(error)
  }
}
const rectBorderStyle = computed(() => {
  if (currBorderRect.value.length == 4) {
    return {
      'pointer-events': 'none',
      border: '2px solid red', position: 'absolute',
      left: currBorderRect.value[0] + 'px',
      top: currBorderRect.value[1] + 'px',
      width: (currBorderRect.value[2] - currBorderRect.value[0] - 2) + 'px',
      height: (currBorderRect.value[3] - currBorderRect.value[1] - 2) + 'px',
    }

  } else {
    return ""
  }
})

const backScriptList = () => window.location.href = '/#/autoList'

const handleMouseEnter = () => {
  console.log("handleMouseEnter")
}
const xuRectBorderStyle = computed(() => {
  if (xuCurrBorderRect.value.length == 4) {
    return {
      'pointer-events': 'none',
      border: '2px dashed red', position: 'absolute',
      left: xuCurrBorderRect.value[0] + 'px',
      top: xuCurrBorderRect.value[1] + 'px',
      width: (xuCurrBorderRect.value[2] - xuCurrBorderRect.value[0] - 2) + 'px',
      height: (xuCurrBorderRect.value[3] - xuCurrBorderRect.value[1] - 2) + 'px',
    }

  } else {
    return ""
  }
})

const renderContent = (h, {node, data, store,}) => {
  const bgStyle = currSelectResourceIdSameCount.value > 1 && data['resource-id'] == currSelectNode.value['resource-id']
  && currSelectNode.value['class'] == data['class']
      ? 'background-color: lightyellow' : ''
  return h(
      'span',
      {
        class: 'custom-tree-node',
      },
      h(
          'el-row',
          {
            style: `${bgStyle};font-size:12px;`,
            onmouseover: () => {
              let result = [data.rect[0], data.rect[1], data.rect[2], data.rect[3]]
              for (let i in result) {
                result[i] = Math.floor(1.0 * result[i] / imgScale.value)
              }
              xuCurrBorderRect.value = result
            }
          }
          , h('span', {
            ondblclick: () => {
              copyToClipboard(node.label)
            }
          }, node.label)
          , data.text && h('span', {
        ondblclick: () => {
          copyToClipboard(data.text)
        }
      }, ` [${data.text}]`)
          , data['content-desc'] && h('span', {
        ondblclick: () => {
          copyToClipboard(data['content-desc'])
        }
      }, ` [${data['content-desc']}]`)
          , data['resource-id'] && h('span', {
        ondblclick: () => {
          copyToClipboard(data['resource-id'])
        }
      }, ` [${data['resource-id']}]`)
      ),
  )
}

const mouseX = ref(0)
const mouseY = ref(0)
const getMousePosition = (event) => {
  const rect = refDumpImg.value.getBoundingClientRect();
  const xMouse = event.clientX;
  const yMouse = event.clientY;
  let x = xMouse - rect.left + 1
  let y = yMouse - rect.top + 1
  x = Math.floor(x * imgScale.value)
  y = Math.floor(y * imgScale.value)
  // console.log(`${x}, ${y}`)
  mouseX.value = x
  mouseY.value = y

  let arr = []
  findRect(arr, uix.value, x, y)
  let result = []
  for (const a of arr) {
    if (result.length == 0) {
      result = a
    } else if (a[0] >= result[0] || a[1] >= result[1]) {
      result = a
    } else if (a[0] == result[0] && a[1] == result[1] && (a[2] <= result[2] || a[3] <= result[3])) {
      result = a
    }
  }
  if (result.length) {
    xuCurrNodeId.value = result.pop()
  }
  for (let i in result) {
    result[i] = Math.floor(1.0 * result[i] / imgScale.value)
  }
  xuCurrBorderRect.value = result
}

const confirmSolidBorder = (event) => {
  if (xuCurrBorderRect.value.length) {
    currBorderRect.value = xuCurrBorderRect.value
    refTree.value.setCurrentKey(xuCurrNodeId.value, true)
    setTimeout(() => {
      let element = document.querySelector(".is-current");
      element && element.scrollIntoView({
        behavior: 'smooth',
        block: 'center', // 或者 'end' 或 'center'
        inline: 'end' // 或者 'end' 或 'center'
      })
    }, 100)
  }
}

const findRect = (resultArr, tree, x, y) => {
  for (let treeElement of tree) {
    if (treeElement.rect) {
      let left = treeElement.rect[0];
      let top = treeElement.rect[1];
      let right = treeElement.rect[2];
      let bottom = treeElement.rect[3];
      if (left <= x && top <= y && right > x && bottom > y) {
        resultArr.push([left, top, right, bottom, treeElement.id])
      }
    }
    if (treeElement.node) {
      findRect(resultArr, treeElement.node, x, y)
    }
  }
}

const findNodesByResourceId = (resultArr, tree) => {
  for (let treeElement of tree) {
    if (currSelectNode.value && currSelectNode.value['resource-id'] == treeElement['resource-id']
        && currSelectNode.value['class'] == treeElement['class']
    ) {
      resultArr.push(treeElement.id)
    }
    if (treeElement.node) {
      findNodesByResourceId(resultArr, treeElement.node)
    }
  }
}

const imgRealWidth = ref(1080)
const imgScale = computed(() => imgRealWidth.value / imgWidth.value)
const img = new Image();
img.onload = function () {
  imgRealWidth.value = this.width;
  // console.log(`imgRealWidth.value: ${imgRealWidth.value} imgScale.value: ${imgScale.value}`)
};

const handleNodeClick = (arg0, arg1, arg2, arg3) => {
  if (arg0.rect) {
    currBorderRect.value = arg0.rect.map(item => 1.0 * item / imgScale.value)
  }
}

const capturePic = () => {
  if (currBorderRect.value.length == 4) {
    let rect = currBorderRect.value.map(value => value * imgScale.value)
    let canvasDom = document.createElement("canvas")
    //内缩5px
    canvasDom.width = rect[2] - rect[0] - 10
    canvasDom.height = rect[3] - rect[1] - 10
    document.querySelector('body').appendChild(canvasDom)
    const ctx = canvasDom.getContext("2d");
    ctx.drawImage(img, rect[0] + 5, rect[1] + 5, canvasDom.width, canvasDom.height, 0, 0, canvasDom.width, canvasDom.height);
    downLoad(canvasDom.toDataURL("image/png"))
    canvasDom.remove()
  }
}

function downLoad(url) {
  const oA = document.createElement("a");
  oA.download = '';// 设置下载的文件名，默认是'下载'
  oA.href = url;
  document.body.appendChild(oA);
  oA.click();
  oA.remove(); // 下载之后把创建的元素删除
}

const refreshDump = () => {
  if (!dumpToggle.value) {
    switchDumpToggle('change')
  }

  axios({
    method: "POST",
    url: "http://localhost:7788/auto/getDump",
    contentType: "application/json",
    data: {
      "uid": "",
    }
  }).then(function (resp) {
    if (resp.data.code === '200') {
      if (resp.data.data.png && resp.data.data.uix) {
        if (png.value != resp.data.data.png) {
          png.value = resp.data.data.png
          uix.value = resp.data.data.uix
          time.value = resp.data.data.time
          activity.value = resp.data.data.activity

          img.src = png.value;
        }
      }
    }
  }).catch(error => {
    alertError("抓取程序未启动，请手动启动 => java -jar jarFile")
  })
}
const dumpToggle = ref(false)
const switchDumpToggle = (change) => {
  axios({
    method: "POST",
    url: "http://localhost:7788/auto/switchDump",
    contentType: "application/json",
    data: {
      "change": change,
    }
  }).then(function (resp) {
    if (resp.data.code === '200') {
      dumpToggle.value = resp.data.data
    }
  })
}
switchDumpToggle('')
refreshDump()

const alertSuccess = (msg = '成功') => {
  ElMessage({
    message: msg,
    type: 'success',
  })
}

const alertError = (msg) => {
  ElNotification({
    title: 'Error',
    message: msg,
    type: 'error',
  })
}
</script>

<style scoped>
.el-input {
  width: 300px;
}

.custom-form-item {
  margin-top: 1px;
  margin-bottom: 0px;
}

.layout_end {
  display: flex;
  justify-content: end
}

</style>