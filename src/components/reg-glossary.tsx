import { BookOpen } from "lucide-react";

// Plain-Korean glossary of the regulatory terms that appear in verdicts, findings, and
// the licensing document lists. Shown so a non-expert Korean exporter can read the result
// without looking anything up.
const GLOSSARY: Array<{ term: string; gloss: string }> = [
  { term: "PIF (제품정보파일)", gloss: "대만이 요구하는 화장품 필수 자료 묶음(성분·안전성·제조·라벨 등). 판매 전 갖춰야 합니다." },
  { term: "COA (성분 시험성적서)", gloss: "원료·완제품의 성분 함량·미생물·중금속 등을 시험한 품질 증명서입니다." },
  { term: "CAS 번호", gloss: "화학물질마다 붙는 국제 고유번호. 같은 성분을 정확히 식별할 때 씁니다." },
  { term: "INCI", gloss: "국제 화장품 성분 표준명(영문). 예: 정제수 = Water = Aqua." },
  { term: "HS·CCC 코드", gloss: "품목분류 번호. 이 번호에 따라 관세율·수입규정·검사요건이 정해집니다." },
  { term: "CIF", gloss: "운임·보험료까지 포함한 수입가격. 관세·세금 계산의 기준값입니다." },
  { term: "포지티브 리스트", gloss: "‘허용된 것만 쓸 수 있는’ 방식. 목록에 없으면 원칙적으로 사용 불가입니다." },
  { term: "특정용도 화장품", gloss: "자외선차단·염모·미백 등 사전 허가가 추가로 필요한 화장품입니다." }
];

export function RegGlossary() {
  return (
    <details className="reg-glossary" open>
      <summary>
        <BookOpen size={14} />
        자주 나오는 용어 쉽게 보기
      </summary>
      <div className="reg-glossary-body">
        <p className="reg-glossary-note">
          <b>참고:</b> ‘추가 확인 필요’·‘제한·금지 가능성’은 <b>‘금지 확정’이 아니라 ‘허용 근거가 아직 확인되지 않았다’</b>는 뜻입니다. 자료를
          보강하면 판정이 바뀔 수 있습니다.
        </p>
        <dl>
          {GLOSSARY.map((item) => (
            <div key={item.term} className="reg-glossary-item">
              <dt>{item.term}</dt>
              <dd>{item.gloss}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
