// SI units. Pure calculation layer shared by the controls, scene and tests.
export const experiments = {
  motion: {
    name: ["Motion and constant speed", "الحركة والسرعة الثابتة"],
    objective: [
      "Predict how distance and travel time affect average speed.",
      "توقّع كيف تؤثر المسافة وزمن الرحلة على السرعة المتوسطة.",
    ],
    formula: "v = d / t",
    unit: "m/s",
    symbol: "v",
    variables: [
      {
        id: "distance",
        name: ["Distance", "المسافة"],
        unit: "m",
        min: 1,
        max: 20,
        step: 1,
        value: 10,
      },
      {
        id: "time",
        name: ["Travel time", "زمن الرحلة"],
        unit: "s",
        min: 1,
        max: 10,
        step: 0.5,
        value: 5,
      },
    ],
  },
  newton: {
    name: ["Newton’s second law", "قانون نيوتن الثاني"],
    objective: [
      "Compare acceleration at constant force or constant mass. The cart starts from rest; friction is neglected.",
      "قارن التسارع عند تثبيت القوة أو الكتلة. تبدأ العربة من السكون مع إهمال الاحتكاك.",
    ],
    formula: "a = F / m",
    unit: "m/s²",
    symbol: "a",
    variables: [
      {
        id: "force",
        name: ["Net force", "القوة المحصلة"],
        unit: "N",
        min: 1,
        max: 20,
        step: 1,
        value: 10,
      },
      { id: "mass", name: ["Mass", "الكتلة"], unit: "kg", min: 0.5, max: 10, step: 0.5, value: 2 },
    ],
  },
  ohm: {
    name: ["Ohm’s law", "قانون أوم"],
    objective: [
      "Observe current in an ideal DC circuit with an ohmic resistor of constant resistance.",
      "راقب التيار في دائرة تيار مستمر مثالية بمقاومة أومية ثابتة.",
    ],
    formula: "I = V / R",
    unit: "A",
    symbol: "I",
    variables: [
      {
        id: "voltage",
        name: ["Voltage", "فرق الجهد"],
        unit: "V",
        min: 1,
        max: 24,
        step: 1,
        value: 12,
      },
      {
        id: "resistance",
        name: ["Resistance", "المقاومة"],
        unit: "Ω",
        min: 1,
        max: 100,
        step: 1,
        value: 20,
      },
    ],
  },
};
export function defaults(id) {
  return Object.fromEntries(experiments[id].variables.map((v) => [v.id, v.value]));
}
export function calculate(id, values) {
  const model = experiments[id];
  if (!model) throw Error("UNKNOWN_EXPERIMENT");
  for (const variable of model.variables) {
    const n = values[variable.id];
    if (!Number.isFinite(n) || n < variable.min || n > variable.max)
      throw Error("INVALID_VARIABLE");
  }
  return id === "motion"
    ? values.distance / values.time
    : id === "newton"
      ? values.force / values.mass
      : values.voltage / values.resistance;
}
export function sample(id, values, elapsed) {
  const result = calculate(id, values),
    duration = id === "motion" ? values.time : id === "newton" ? Math.sqrt(20 / result) : 4;
  const time = Math.max(0, Math.min(duration, elapsed));
  return {
    result,
    duration,
    time,
    fraction: time / duration,
    position: id === "newton" ? 0.5 * result * time * time : id === "motion" ? result * time : 0,
    velocity: id === "newton" ? result * time : id === "motion" ? result : 0,
    finished: elapsed >= duration,
  };
}
