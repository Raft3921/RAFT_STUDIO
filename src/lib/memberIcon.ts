import moronIcon from '../../assets/もろん.png'
import maiIcon from '../../assets/まい.png'
import gyozaIcon from '../../assets/ギョーザ.png'
import weekIcon from '../../assets/ウィーク.png'
import mutoIcon from '../../assets/ムート.png'
import raftIcon from '../../assets/ラフト.png'
import yansanIcon from '../../assets/やんさん.png'
import tanutsunaIcon from '../../assets/たぬつな.png'

const normalizeName = (value: string) => value.trim().replace(/\s+/g, '')

const iconByName: Record<string, string> = {
  ラフト: raftIcon,
  まい: maiIcon,
  たぬつな: tanutsunaIcon,
  やんさん: yansanIcon,
  ムート: mutoIcon,
  もろん: moronIcon,
  ウィーク: weekIcon,
  ギョーザ: gyozaIcon,
}

export const getMemberIcon = (displayName: string) => {
  return iconByName[normalizeName(displayName)] ?? raftIcon
}
