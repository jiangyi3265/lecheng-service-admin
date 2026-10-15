<template>
  <div v-if="!item.hidden">
    <template v-if="hasOneShowingChild(item.children, item) && (!onlyOneChild.children || onlyOneChild.noShowingChildren) && !item.alwaysShow">
      <app-link v-if="onlyOneChild.meta" :to="resolvePath(onlyOneChild.path, onlyOneChild.query)">
        <el-menu-item :index="resolvePath(onlyOneChild.path)" :class="{ 'submenu-title-noDropdown': !isNest }">
          <svg-icon :icon-class="onlyOneChild.meta.icon || (item.meta && item.meta.icon)"/>
          <i v-if="unreadBadge(onlyOneChild)" class="menu-unread-dot" aria-hidden="true" />
          <template #title><span class="menu-title" :title="hasTitle(onlyOneChild.meta.title)">{{ onlyOneChild.meta.title }}</span><span v-if="unreadBadge(onlyOneChild)" class="menu-unread-badge" :aria-label="'未读消息 ' + unreadBadge(onlyOneChild) + ' 条'">{{ unreadBadge(onlyOneChild) }}</span></template>
        </el-menu-item>
      </app-link>
    </template>

    <el-sub-menu v-else ref="subMenu" :index="resolvePath(item.path)" teleported>
      <template v-if="item.meta" #title>
        <svg-icon :icon-class="item.meta && item.meta.icon" />
        <span class="menu-title" :title="hasTitle(item.meta.title)">{{ item.meta.title }}</span>
      </template>

      <sidebar-item
        v-for="(child, index) in item.children"
        :key="child.path + index"
        :is-nest="true"
        :item="child"
        :base-path="resolvePath(child.path)"
        class="nest-menu"
      />
    </el-sub-menu>
  </div>
</template>

<script setup>
import { isExternal } from '@/utils/validate'
import AppLink from './Link'
import { getNormalPath } from '@/utils/ruoyi'
import { lechengUnread, unreadText, CONSULT_ROUTE } from '@/utils/lecheng-unread'

const props = defineProps({
  // route object
  item: {
    type: Object,
    required: true
  },
  isNest: {
    type: Boolean,
    default: false
  },
  basePath: {
    type: String,
    default: ''
  }
})

const onlyOneChild = ref({})

function hasOneShowingChild(children = [], parent) {
  if (!children) {
    children = []
  }
  const showingChildren = children.filter(item => {
    if (item.hidden) {
      return false
    }
    onlyOneChild.value = item
    return true
  })

  // When there is only one child router, the child router is displayed by default
  if (showingChildren.length === 1) {
    return true
  }

  // Show parent if there are no child router to display
  if (showingChildren.length === 0) {
    onlyOneChild.value = { ...parent, path: '', noShowingChildren: true }
    return true
  }

  return false
}

function resolvePath(routePath, routeQuery) {
  if (isExternal(routePath)) {
    return routePath
  }
  if (isExternal(props.basePath)) {
    return props.basePath
  }
  if (routeQuery) {
    let query = JSON.parse(routeQuery)
    return { path: getNormalPath(props.basePath + '/' + routePath), query: query }
  }
  return getNormalPath(props.basePath + '/' + routePath)
}

function hasTitle(title){
  if (title.length > 5) {
    return title
  } else {
    return ""
  }
}

// “客服咨询”菜单显示未读消息数：展开时是红色数字，侧边栏收起时是图标右上角的红点
function unreadBadge(route) {
  return route && route.name === CONSULT_ROUTE && lechengUnread.count > 0 ? unreadText(lechengUnread.count) : ''
}
</script>

<style scoped>
.menu-unread-badge {
  display: inline-block;
  flex-shrink: 0;
  box-sizing: border-box;
  min-width: 18px;
  height: 18px;
  margin-left: 8px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--el-color-danger, #f56c6c);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  vertical-align: middle !important;
}
.el-menu-item > .menu-unread-badge {
  margin-left: auto;
}
.menu-unread-dot {
  display: none;
}
.el-menu--collapse .menu-unread-dot {
  display: block;
  position: absolute;
  top: 16px;
  left: 32px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-danger, #f56c6c);
}
</style>
