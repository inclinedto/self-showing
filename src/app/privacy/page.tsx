import { type LegalSection, LegalPage } from "@/components/ui/LegalPage";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/resources/site";

export const metadata = pageMetadata({
  title: "隐私政策",
  description: `${site.name}隐私政策`,
  path: "/privacy",
});

const contact = site.contactEmail ? `邮件 ${site.contactEmail}` : "本站提问箱";

const sections: LegalSection[] = [
  {
    title: "我们收集哪些信息",
    paragraphs: [
      "账号信息：用户名和密码。密码经过加盐哈希（scrypt）后保存，任何人（包括站长）都看不到明文。",
      "登录状态：登录后浏览器会保存一个名为 zjs_session 的 Cookie，用来保持登录，有效期 30 天。",
      "使用记录：每项功能每天的使用次数，用于计算额度。",
      "你发布的内容：树洞、评论、提问会和你的账号关联保存，方便你查看和删除自己的内容，也用于处理滥用。",
      "订单信息：订单号、套餐、金额、支付平台订单号。",
      "我们不收集手机号、邮箱、真实姓名或身份证号，也不使用第三方广告追踪。",
    ],
  },
  {
    title: "你的文件如何处理",
    paragraphs: [
      "格式转换：全部在你的浏览器里完成，文件不会上传。",
      "文档问答：文档在浏览器本地解析，每次提问只把最相关的几段文字发送给 AI 服务商生成回答。",
      "表格提取：你选中的页面会转成图片发送给 AI 服务商识别。",
      "AI 小助手：对话记录只保存在你自己浏览器的本地存储里。发送消息时，最近的对话内容会经本站服务器转发给 AI 服务商。",
      "本站服务器不保存你上传的文件、文档片段和对话内容。",
    ],
  },
  {
    title: "匿名与可见范围",
    paragraphs: [
      "其他用户在树洞和提问箱里只能看到随机昵称，看不到你的用户名。同一条树洞下你的昵称保持一致，不同树洞之间的昵称无法互相关联。",
      "出于安全管理需要，站长可以在数据库中看到内容与账号的对应关系，但不会主动公开，除非法律法规要求或为保护他人人身安全。",
    ],
  },
  {
    title: "第三方服务",
    paragraphs: [
      "为了提供服务，本站使用以下第三方：网站托管（Vercel）、数据库托管服务商、AI 大模型服务商（例如阿里云百炼）、支付平台（爱发电）。它们只会收到完成对应功能所必需的数据。",
      "通过爱发电付款时，你的支付信息由爱发电和支付渠道处理，本站只收到订单结果，看不到你的银行卡或支付账号。",
    ],
  },
  {
    title: "安全措施",
    paragraphs: [
      "全站使用 HTTPS 加密传输；登录 Cookie 设置为 HttpOnly，网页脚本无法读取；登录、注册、发帖都有频率限制，防止暴力破解和刷屏。",
      "访问时的 IP 地址只用于短时间的频率限制，不会写入数据库；托管平台可能按其政策保留访问日志。",
    ],
  },
  {
    title: "你的权利",
    paragraphs: [
      "你可以随时删除自己发布的树洞和评论，在账户页修改密码。",
      `如果需要注销账号或删除全部数据，请通过${contact}联系站长，核实后会删除账号及关联的内容和使用记录（订单记录可能按法律要求保留）。`,
    ],
  },
  {
    title: "未成年人",
    paragraphs: ["如果你未满 14 周岁，请在监护人的同意和指导下使用本站。"],
  },
  {
    title: "政策更新",
    paragraphs: ["本政策如有更新，会在本页面公布并更新日期。重大变化会在网站显著位置提示。"],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="隐私政策"
      updated="2026 年 11 月 19 日"
      intro={`${site.name}重视你的隐私。本政策说明我们收集哪些信息、怎么使用，以及你可以如何管理它们。`}
      sections={sections}
    />
  );
}
