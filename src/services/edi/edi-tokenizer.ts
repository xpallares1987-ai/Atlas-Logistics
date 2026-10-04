/**
 * Low-level Tokenizer & AST Builder for UN/EDIFACT and ANSI X12 Interchanges.
 * Designed with zero external dependencies, robust delimiter auto-detection,
 * and standard release character handling.
 */

export type EdiStandard = "EDIFACT" | "ANSI_X12" | "UNKNOWN";

export interface EdiCompositeElement {
  isComposite: true;
  components: string[];
}

export type EdiElement = string | EdiCompositeElement;

export interface EdiSegment {
  tag: string;
  elements: EdiElement[];
  raw: string;
}

export interface EdiDocumentAST {
  standard: EdiStandard;
  delimiters: {
    segmentTerminator: string;
    elementSeparator: string;
    componentSeparator?: string;
    releaseCharacter?: string;
  };
  segments: EdiSegment[];
  interchangesCount: number;
  functionalGroupsCount: number;
  messagesCount: number;
}

export class EdiTokenizer {
  /**
   * Sniff standard and delimiters from raw EDI stream
   */
  public static detectStandard(raw: string): EdiStandard {
    const trimmed = raw.trim();
    if (trimmed.startsWith("UNA") || trimmed.startsWith("UNB")) {
      return "EDIFACT";
    }
    if (trimmed.startsWith("ISA")) {
      return "ANSI_X12";
    }
    return "UNKNOWN";
  }

  /**
   * Tokenize an EDIFACT interchange
   */
  public static tokenizeEdifact(raw: string): EdiDocumentAST {
    let content = raw.trim();
    let segmentTerminator = "'";
    let elementSeparator = "+";
    let componentSeparator = ":";
    let releaseCharacter = "?";

    // Check for UNA Service String Advice (UNA:+.? ')
    if (content.startsWith("UNA")) {
      componentSeparator = content[3] || ":";
      elementSeparator = content[4] || "+";
      // decimal mark = content[5] (unused in parsing)
      releaseCharacter = content[6] || "?";
      // reserved = content[7]
      segmentTerminator = content[8] || "'";
      content = content.slice(9).trim();
    }

    const segments: EdiSegment[] = [];
    let currentRaw = "";
    let inEscape = false;

    // Split segments respecting releaseCharacter
    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (inEscape) {
        currentRaw += char;
        inEscape = false;
        continue;
      }

      if (char === releaseCharacter) {
        currentRaw += char;
        inEscape = true;
        continue;
      }

      if (char === segmentTerminator) {
        const segTrimmed = currentRaw.trim();
        if (segTrimmed.length > 0) {
          segments.push(
            this.parseEdifactSegment(
              segTrimmed,
              elementSeparator,
              componentSeparator,
              releaseCharacter,
            ),
          );
        }
        currentRaw = "";
        continue;
      }

      currentRaw += char;
    }

    if (currentRaw.trim().length > 0) {
      segments.push(
        this.parseEdifactSegment(
          currentRaw.trim(),
          elementSeparator,
          componentSeparator,
          releaseCharacter,
        ),
      );
    }

    const messagesCount = segments.filter((s) => s.tag === "UNH").length || 1;

    return {
      standard: "EDIFACT",
      delimiters: {
        segmentTerminator,
        elementSeparator,
        componentSeparator,
        releaseCharacter,
      },
      segments,
      interchangesCount: segments.filter((s) => s.tag === "UNB").length || 1,
      functionalGroupsCount: segments.filter((s) => s.tag === "UNG").length || 1,
      messagesCount,
    };
  }

  private static parseEdifactSegment(
    rawSeg: string,
    elemSep: string,
    compSep: string,
    releaseChar: string,
  ): EdiSegment {
    // Split elements respecting release character
    const rawElements: string[] = [];
    let curElem = "";
    let inEscape = false;

    for (let i = 0; i < rawSeg.length; i++) {
      const char = rawSeg[i];

      if (inEscape) {
        curElem += char;
        inEscape = false;
        continue;
      }

      if (char === releaseChar) {
        inEscape = true;
        continue;
      }

      if (char === elemSep) {
        rawElements.push(curElem);
        curElem = "";
        continue;
      }

      curElem += char;
    }
    rawElements.push(curElem);

    const tag = rawElements[0].trim();
    const dataElements = rawElements.slice(1);

    const parsedElements: EdiElement[] = dataElements.map((el) => {
      if (el.includes(compSep)) {
        // Parse composite element
        const components: string[] = [];
        let curComp = "";
        let inCompEscape = false;
        for (let j = 0; j < el.length; j++) {
          const c = el[j];
          if (inCompEscape) {
            curComp += c;
            inCompEscape = false;
            continue;
          }
          if (c === releaseChar) {
            inCompEscape = true;
            continue;
          }
          if (c === compSep) {
            components.push(curComp);
            curComp = "";
            continue;
          }
          curComp += c;
        }
        components.push(curComp);
        return { isComposite: true, components };
      }
      return el;
    });

    return {
      tag,
      elements: parsedElements,
      raw: rawSeg,
    };
  }

  /**
   * Tokenize an ANSI X12 interchange
   */
  public static tokenizeX12(raw: string): EdiDocumentAST {
    const content = raw.trim();
    if (!content.startsWith("ISA")) {
      throw new Error("Invalid ANSI X12 payload: Missing ISA header");
    }

    // ISA segment fixed element separator is at index 3
    const elementSeparator = content[3]; // typically '*'
    // ISA length is 106 characters
    // ISA segment terminator is at index 105
    const segmentTerminator = content[105]; // typically '~' or '\n'
    // Sub-element component separator is at index 104
    const componentSeparator = content[104]; // typically '>' or ':'

    const rawSegments = content
      .split(segmentTerminator)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const segments: EdiSegment[] = rawSegments.map((segStr) => {
      const parts = segStr.split(elementSeparator);
      const tag = parts[0].trim();
      const elements: EdiElement[] = parts.slice(1).map((part) => {
        if (componentSeparator && part.includes(componentSeparator)) {
          return {
            isComposite: true,
            components: part.split(componentSeparator),
          };
        }
        return part;
      });

      return {
        tag,
        elements,
        raw: segStr,
      };
    });

    const messagesCount = segments.filter((s) => s.tag === "ST").length || 1;

    return {
      standard: "ANSI_X12",
      delimiters: {
        segmentTerminator,
        elementSeparator,
        componentSeparator,
      },
      segments,
      interchangesCount: segments.filter((s) => s.tag === "ISA").length || 1,
      functionalGroupsCount: segments.filter((s) => s.tag === "GS").length || 1,
      messagesCount,
    };
  }

  /**
   * Universal tokenization entry point
   */
  public static tokenize(raw: string): EdiDocumentAST {
    const standard = this.detectStandard(raw);
    if (standard === "EDIFACT") {
      return this.tokenizeEdifact(raw);
    }
    if (standard === "ANSI_X12") {
      return this.tokenizeX12(raw);
    }
    throw new Error(
      "Unsupported or unrecognized EDI format. Expected UNB (EDIFACT) or ISA (ANSI X12).",
    );
  }
}
