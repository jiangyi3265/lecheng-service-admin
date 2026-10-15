import atlas from '@/assets/images/lecheng-scenes.jpg'

// 小程序 ScenePhoto 的 4 张默认插画拼在一张 2×2 的大图里（小程序 static/images/medical-atlas.jpg 的缩小版），
// 按编号取对应的四分之一：0 左上、1 右上、2 左下、3 右下
export const SCENE_NAMES = ['园区楼群', '玻璃大楼', '医院入口', '园区鸟瞰']
export const sceneIndex = scene => [0, 1, 2, 3].includes(Number(scene)) ? Number(scene) : 0
export function sceneStyle(scene) {
  const n = sceneIndex(scene)
  return { backgroundImage: `url(${atlas})`, backgroundSize: '200% 200%', backgroundPosition: `${n % 2 ? '100%' : '0'} ${n > 1 ? '100%' : '0'}`, backgroundRepeat: 'no-repeat' }
}
