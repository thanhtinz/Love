import type { IconName } from "@/components/Icon";

export const QUESTIONS = [
  "Điều nhỏ bé nào của đối phương khiến bạn mỉm cười hôm nay?",
  "Kỷ niệm nào của hai đứa khiến bạn muốn quay lại nhất?",
  "Nếu được đi du lịch bất cứ đâu cùng nhau, bạn chọn nơi nào?",
  "Bạn biết ơn đối phương vì điều gì nhất tuần này?",
  "Món ăn nào bạn muốn cùng nhau nấu thử?",
  "Điều gì ở đối phương khiến bạn tự hào nhất?",
  "Ước mơ chung lớn nhất của hai đứa là gì?",
  "Lần đầu gặp nhau, bạn ấn tượng điều gì nhất?",
  "Bạn muốn nhận được cái ôm như thế nào khi mệt?",
  "Bài hát nào gợi nhớ về hai đứa mình nhất?",
  "Nếu có một ngày nghỉ hoàn hảo cùng nhau, hai đứa sẽ làm gì?",
  "Điều bạn muốn cùng nhau học trong năm nay là gì?",
  "Bạn thích được khen về điều gì nhất?",
  "Thói quen nhỏ nào của hai đứa bạn muốn giữ mãi?",
  "Nếu trúng số, điều đầu tiên hai đứa làm cùng nhau là gì?",
  "Bạn mong đối phương hiểu điều gì về bạn hơn?",
  "Buổi hẹn hò lý tưởng trong mơ của bạn là gì?",
  "Điều lãng mạn nhất đối phương từng làm cho bạn?",
  "Bạn muốn cùng nhau già đi như thế nào?",
  "Hôm nay bạn muốn nói lời yêu thương gì với đối phương?",
  "Nơi nào hai đứa nhất định phải đến trước năm sau?",
  "Bạn cảm thấy được yêu nhất khi đối phương làm gì?",
  "Nếu nuôi một thú cưng chung, bạn muốn nuôi con gì?",
  "Điều gì khiến bạn tin hai đứa sẽ đi đường dài?",
];
export interface DateIdea { icon: IconName; text: string }
export const DATE_IDEAS: DateIdea[] = [
  { icon: "note", text: "Picnic công viên + bánh tự làm" },
  { icon: "flower", text: "Cùng nhau vẽ tranh chibi tặng nhau" },
  { icon: "gift", text: "Food tour chợ đêm, mỗi người chọn 3 món" },
  { icon: "home", text: "Xem phim tại nhà + bắp rang + chăn ấm" },
  { icon: "camera", text: "Chụp photobooth và in ảnh dán tường" },
  { icon: "sunset", text: "Đạp xe quanh hồ lúc hoàng hôn" },
  { icon: "heart", text: "Học làm bánh tại workshop" },
  { icon: "star", text: "Ngắm sao + kể chuyện tuổi thơ" },
  { icon: "bag", text: "Thử thách: mua quà cho nhau dưới 100k" },
  { icon: "sparkle", text: "Karaoke song ca bài tủ của hai đứa" },
  { icon: "flower", text: "Đi vườn hoa / nông trại hái dâu" },
  { icon: "chat", text: "Cafe sách, đọc cho nhau nghe một chương" },
  { icon: "sun", text: "Đi biển, xây lâu đài cát hình trái tim" },
  { icon: "party", text: "Chơi game co-op cùng nhau cả buổi" },
  { icon: "send", text: "Lên kế hoạch chuyến đi mơ ước trên giấy" },
];
/** V4: mood dùng id (FaceIcon vẽ SVG). Thứ tự giữ tương ứng bộ mood cũ để map dữ liệu đã lưu. */
export const MOODS: { id: string; label: string }[] = [
  { id: "joy", label: "Vui vẻ" },
  { id: "love", label: "Đang yêu đời" },
  { id: "heartEyes", label: "Mê mẩn" },
  { id: "sleepy", label: "Buồn ngủ" },
  { id: "pleading", label: "Nhõng nhẽo" },
  { id: "huff", label: "Hờn dỗi" },
  { id: "sick", label: "Bị ốm" },
  { id: "celebrate", label: "Ăn mừng" },
  { id: "calm", label: "Thư giãn" },
  { id: "excited", label: "Phấn khích" },
  { id: "sad", label: "Hơi buồn" },
  { id: "energetic", label: "Tràn năng lượng" },
];
export const moodLabel = (id: string): string => MOODS.find((m) => m.id === id)?.label || id;
export const NOTE_COLORS = ["bg-pink-100", "bg-amber-100", "bg-sky-100", "bg-emerald-100", "bg-violet-100", "bg-rose-100"];
export function questionOfDay(date = new Date()) {
  const dayNum = Math.floor(date.getTime() / 86400000);
  return QUESTIONS[dayNum % QUESTIONS.length];
}

export interface LoveMessage { id: number; text: string; rarity: "common" | "rare" | "legendary"; }
export const LOVE_MESSAGES: LoveMessage[] = [
  // Thường (1-18)
  { id: 1, text: "Mỗi ngày có em/anh bên cạnh đều là một ngày đáng yêu hơn hôm qua một chút.", rarity: "common" },
  { id: 2, text: "Cảm ơn vì đã luôn ở đây, dù chỉ là một tin nhắn chào buổi sáng.", rarity: "common" },
  { id: 3, text: "Nụ cười của em/anh là nắng của khu vườn này đó.", rarity: "common" },
  { id: 4, text: "Ở bên nhau không cần hoàn hảo, chỉ cần thật lòng.", rarity: "common" },
  { id: 5, text: "Hôm nay mệt thì tựa vào vai nhau một lát nhé.", rarity: "common" },
  { id: 6, text: "Tình yêu lớn lên từ những điều nhỏ bé mình làm cho nhau mỗi ngày.", rarity: "common" },
  { id: 7, text: "Em/Anh là lý do chiếc cây này xanh tốt như vậy.", rarity: "common" },
  { id: 8, text: "Chỉ cần hai đứa cùng tưới, cây nào rồi cũng sẽ nở hoa.", rarity: "common" },
  { id: 9, text: "Yêu là cùng nhau lớn lên, như cây này vậy.", rarity: "common" },
  { id: 10, text: "Một cái ôm hôm nay đáng giá hơn ngàn lời nói.", rarity: "common" },
  { id: 11, text: "Cảm ơn vì đã chọn nhau, hết lần này đến lần khác.", rarity: "common" },
  { id: 12, text: "Bình yên nhất là khi được ở cạnh người mình thương.", rarity: "common" },
  { id: 13, text: "Dù bận đến đâu, đừng quên nói lời yêu thương nhé.", rarity: "common" },
  { id: 14, text: "Em/Anh làm cho những ngày bình thường trở nên đặc biệt.", rarity: "common" },
  { id: 15, text: "Hai trái tim, một khu vườn, một hành trình dài.", rarity: "common" },
  { id: 16, text: "Khoảnh khắc đẹp nhất là khoảnh khắc có nhau.", rarity: "common" },
  { id: 17, text: "Yêu thương không cần ồn ào, chỉ cần đều đặn như tưới cây.", rarity: "common" },
  { id: 18, text: "Hôm nay cũng thương nhau nhiều hơn hôm qua nhé.", rarity: "common" },
  // Hiếm (19-28)
  { id: 19, text: "SONG CHĂM: Khi hai trái tim cùng đập một nhịp, cả khu vườn bừng sáng. Hai đứa vừa tạo ra khoảnh khắc hiếm có đó!", rarity: "rare" },
  { id: 20, text: "Người ta nói tình yêu đẹp nhất là khi cả hai cùng cố gắng — và hai đứa đang làm đúng như vậy.", rarity: "rare" },
  { id: 21, text: "Mốc chăm sóc này chứng minh: yêu thương của hai đứa không phải cảm xúc nhất thời, mà là thói quen bền bỉ.", rarity: "rare" },
  { id: 22, text: "Có những người đi qua đời nhau như gió, còn hai đứa chọn ở lại và cùng nhau bén rễ.", rarity: "rare" },
  { id: 23, text: "Nếu tình yêu là một khu vườn, hai đứa là hai người làm vườn tận tâm nhất thế gian.", rarity: "rare" },
  { id: 24, text: "Khoảnh khắc cả hai cùng chăm cây là minh chứng: khoảng cách nào cũng thua sự đồng lòng.", rarity: "rare" },
  { id: 25, text: "Chúc mừng cột mốc mới! Mỗi lần chăm là một lời hứa thầm lặng: mình sẽ không bỏ cuộc.", rarity: "rare" },
  { id: 26, text: "Tình yêu của hai đứa vừa lên một nấc thang mới — rực rỡ và đáng tự hào.", rarity: "rare" },
  { id: 27, text: "Hai bàn tay cùng vun trồng thì không có mùa đông nào làm cây héo được.", rarity: "rare" },
  { id: 28, text: "Thư hiếm này chỉ xuất hiện khi hai đứa thật sự đồng điệu. Giữ chặt nhau nhé!", rarity: "rare" },
  // Huyền thoại (29-36)
  { id: 29, text: "HUYỀN THOẠI: Cây đã nở hoa! Tình yêu của hai đứa đã đi từ hạt mầm thành một khu vườn rực rỡ — đây là điều rất ít cặp đôi làm được.", rarity: "legendary" },
  { id: 30, text: "HUYỀN THOẠI: Dưới tán cây trái tim này, hãy hứa với nhau: dù bão giông, mình vẫn cùng nhau che chở.", rarity: "legendary" },
  { id: 31, text: "HUYỀN THOẠI: Em/Anh là định mệnh đẹp nhất. Cây trái tim này là chứng nhân cho một tình yêu phi thường.", rarity: "legendary" },
  { id: 32, text: "HUYỀN THOẠI: Từ một hạt giống nhỏ, hai đứa đã trồng nên cả một bầu trời yêu thương. Tự hào về hai đứa lắm!", rarity: "legendary" },
  { id: 33, text: "HUYỀN THOẠI: Người đời tìm kiếm phép màu, còn phép màu của hai đứa chính là nhau.", rarity: "legendary" },
  { id: 34, text: "HUYỀN THOẠI: Nếu viết thành sách, câu chuyện của hai đứa sẽ là chương đẹp nhất — và cây này là trang bìa lấp lánh.", rarity: "legendary" },
  { id: 35, text: "HUYỀN THOẠI: Yêu đến mức làm cây kết trái tim — cấp độ này chỉ dành cho những trái tim kiên định nhất.", rarity: "legendary" },
  { id: 36, text: "HUYỀN THOẠI: Mãi mãi không phải là lời hứa suông, mà là từng ngày hai đứa đã, đang và sẽ chăm sóc nhau như hôm nay.", rarity: "legendary" },
];
export function pickMessage(rarity: "common" | "rare" | "legendary", ownedIds: number[]): LoveMessage {
  const pool = LOVE_MESSAGES.filter((m) => m.rarity === rarity);
  const fresh = pool.filter((m) => !ownedIds.includes(m.id));
  const src = fresh.length ? fresh : pool;
  return src[Math.floor(Math.random() * src.length)];
}
export const QUESTS: { id: string; label: string; icon: IconName; target: number; key: "water" | "love" | "both"; rewardXp: number; rewardCoins: number }[] = [
  { id: "water3", label: "Tưới nước 3 lần hôm nay", icon: "drop", target: 3, key: "water", rewardXp: 15, rewardCoins: 20 },
  { id: "love2", label: "Bón tim 2 lần hôm nay", icon: "heart", target: 2, key: "love", rewardXp: 15, rewardCoins: 20 },
  { id: "both", label: "Cả 2 người đều chăm cây hôm nay", icon: "users", target: 2, key: "both", rewardXp: 20, rewardCoins: 20 },
];
export const ACHIEVEMENTS: { id: string; icon: IconName; label: string }[] = [
  { id: "first", icon: "sprout", label: "Lần chăm đầu tiên" },
  { id: "combo", icon: "sparkle", label: "Combo Song chăm đầu tiên" },
  { id: "care25", icon: "medal", label: "Chăm cây 25 lần" },
  { id: "bloom", icon: "flower", label: "Cây nở hoa" },
  { id: "hearttree", icon: "heart", label: "Cây trái tim" },
  { id: "collector10", icon: "envelope", label: "Sưu tập 10 lá thư" },
  { id: "streak3", icon: "flame", label: "Streak 3 ngày chăm cây" },
  { id: "questall", icon: "trophy", label: "Hoàn thành hết nhiệm vụ ngày" },
  { id: "shopper", icon: "bag", label: "Mua món đồ đầu tiên ở cửa hàng" },
  { id: "memories3", icon: "camera", label: "Lưu giữ 3 kỷ niệm" },
];

/* ---------- v2: Cửa hàng trang trí vườn ---------- */
import type { ShopCategory } from "./types";
export interface ShopItem {
  id: string; category: ShopCategory; name: string; icon: IconName; price: number; desc: string;
  /** pot: màu chậu (gradient tailwind) · scene: gradient bầu trời · accessory: tên icon phụ kiện */
  visual: string;
}
export const SHOP_ITEMS: ShopItem[] = [
  // Chậu cây
  { id: "pot-basic", category: "pot", name: "Chậu đất nung", icon: "pot", price: 0, desc: "Chậu mặc định mộc mạc, thân thuộc", visual: "from-orange-200 via-orange-300 to-amber-400" },
  { id: "pot-blue", category: "pot", name: "Chậu gốm xanh", icon: "pot", price: 60, desc: "Gốm xanh mát mắt như bầu trời", visual: "from-sky-300 via-blue-400 to-indigo-400" },
  { id: "pot-pink", category: "pot", name: "Chậu hồng chibi", icon: "pot", price: 90, desc: "Hồng pastel siêu cưng, hợp khu vườn nhất", visual: "from-pink-300 via-rose-400 to-pink-500" },
  { id: "pot-gold", category: "pot", name: "Chậu vàng hoàng kim", icon: "crown", price: 180, desc: "Lấp lánh sang chảnh cho cây huyền thoại", visual: "from-amber-200 via-yellow-400 to-amber-500" },
  // Nền cảnh vườn
  { id: "scene-auto", category: "scene", name: "Theo giờ thật", icon: "clock", price: 0, desc: "Trời tự đổi sáng / chiều / tối theo đồng hồ thật", visual: "" },
  { id: "scene-sunset", category: "scene", name: "Hoàng hôn tím", icon: "sunset", price: 80, desc: "Nhuộm cả khu vườn màu hoàng hôn lãng mạn", visual: "from-orange-200 via-pink-200 to-violet-200" },
  { id: "scene-night", category: "scene", name: "Đêm đầy sao", icon: "moon", price: 100, desc: "Bầu trời đêm, trăng sao và đom đóm", visual: "from-indigo-300 via-violet-200 to-slate-700" },
  { id: "scene-rainbow", category: "scene", name: "Cầu vồng mơ mộng", icon: "rainbow", price: 150, desc: "Pastel cầu vồng sau cơn mưa tình yêu", visual: "from-rose-200 via-amber-100 to-sky-200" },
  // Phụ kiện (visual = tên icon gắn lên cây)
  { id: "acc-none", category: "accessory", name: "Không phụ kiện", icon: "empty", price: 0, desc: "Để cây tự nhiên nhất", visual: "" },
  { id: "acc-bow", category: "accessory", name: "Nơ hồng", icon: "ribbon", price: 40, desc: "Thắt nơ cho cây — món đầu tiên ai cũng mua được", visual: "ribbon" },
  { id: "acc-chime", category: "accessory", name: "Chuông gió", icon: "bell", price: 55, desc: "Chuông gió đung đưa kêu leng keng bên cây", visual: "bell" },
  { id: "acc-lantern", category: "accessory", name: "Đèn lồng", icon: "lantern", price: 70, desc: "Đèn lồng ấm áp thắp sáng góc vườn", visual: "lantern" },
  { id: "acc-butterfly", category: "accessory", name: "Đàn bướm", icon: "butterfly", price: 85, desc: "Thêm đàn bướm bay lượn quanh cây cả ngày", visual: "butterfly" },
];
export const shopItem = (id: string) => SHOP_ITEMS.find((i) => i.id === id) || SHOP_ITEMS[0];
/** Gradient trời theo giờ thật (cho scene-auto). orb = tên icon mặt trời/mặt trăng. */
export function timeSky(hour: number): { sky: string; orb: IconName; night: boolean; label: string } {
  if (hour >= 5 && hour < 10) return { sky: "from-amber-100 via-rose-100 to-sky-100", orb: "sunrise", night: false, label: "Buổi sáng" };
  if (hour >= 10 && hour < 16) return { sky: "from-sky-200 via-sky-100 to-emerald-50", orb: "sun", night: false, label: "Ban ngày" };
  if (hour >= 16 && hour < 19) return { sky: "from-orange-200 via-pink-200 to-violet-100", orb: "sunset", night: false, label: "Hoàng hôn" };
  return { sky: "from-indigo-400 via-violet-300 to-slate-600", orb: "moon", night: true, label: "Ban đêm" };
}

/* ---------- v2: Hành động yêu thương nhanh ---------- */
export const LOVE_ACTIONS: { kind: string; icon: IconName; name: string; label: string }[] = [
  { kind: "hug", icon: "hug", name: "Ôm", label: "gửi một cái ôm thật ấm áp" },
  { kind: "kiss", icon: "kiss", name: "Hôn gió", label: "gửi một nụ hôn gió" },
  { kind: "flower", icon: "bouquet", name: "Tặng hoa", label: "tặng một bó hoa thơm ngát" },
  { kind: "star", icon: "star", name: "Thả sao", label: "thả một ngôi sao may mắn" },
];
