function decorate(names, selected) {
  const on = {};
  (selected || []).forEach(function (name) {
    on[name] = true;
  });
  return names.map(function (name) {
    return { name: name, on: !!on[name] };
  });
}

function one(list, fallback) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].on) return list[i].name;
  }
  return fallback;
}

function many(list) {
  const out = [];
  (list || []).forEach(function (item) {
    if (item.on) out.push(item.name);
  });
  return out;
}

function toggleOne(list, name) {
  return list.map(function (item) {
    return { name: item.name, on: item.name === name };
  });
}

function toggleMany(list, name) {
  return list.map(function (item) {
    if (item.name !== name) return item;
    return { name: item.name, on: !item.on };
  });
}

function ensure(list, name, single) {
  const exists = list.some(function (item) {
    return item.name === name;
  });
  let next = exists ? list : list.concat([{ name: name, on: false }]);
  if (single) return toggleOne(next, name);
  return next.map(function (item) {
    if (item.name !== name) return item;
    return { name: item.name, on: true };
  });
}

module.exports = {
  decorate: decorate,
  one: one,
  many: many,
  toggleOne: toggleOne,
  toggleMany: toggleMany,
  ensure: ensure
};
