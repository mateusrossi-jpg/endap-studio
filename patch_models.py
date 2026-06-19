import os

files = {
    'tag_value.dart': """
  TagValue clone() {
    return TagValue(
      boolValue: boolValue,
      intValue: intValue,
      realValue: realValue,
      stringValue: stringValue,
    );
  }
}""",
    'tag.dart': """
  Tag clone() {
    return Tag(
      id: id,
      name: name,
      type: type,
      initialValue: initialValue?.clone(),
    );
  }
}""",
    'project_metadata.dart': """
  ProjectMetadata clone() {
    return ProjectMetadata(
      version: version,
      author: author,
      targetPlatform: targetPlatform,
    );
  }
}""",
    'node_config.dart': """
  NodeConfig clone() {
    return NodeConfig(
      tagId: tagId,
      presetValue: presetValue?.clone(),
    );
  }
}""",
    'ladder_project.dart': """
  LadderProject clone() {
    return LadderProject(
      id: id,
      name: name,
      tags: tags.map((k, v) => MapEntry(k, v.clone())),
      networks: networks.map((n) => n.clone()).toList(),
      metadata: metadata.clone(),
    );
  }
}""",
    'ladder_node.dart': """
  LadderNode clone() {
    return LadderNode(
      id: id,
      type: type,
      config: config.clone(),
    );
  }
}""",
    'ladder_network.dart': """
  LadderNetwork clone() {
    return LadderNetwork(
      id: id,
      name: name,
      nodes: nodes.map((n) => n.clone()).toList(),
      connections: connections.map((c) => c.clone()).toList(),
    );
  }
}""",
    'ladder_connection.dart': """
  LadderConnection clone() {
    return LadderConnection(
      id: id,
      fromNodeId: fromNodeId,
      fromPort: fromPort,
      toNodeId: toNodeId,
      toPort: toPort,
    );
  }
}"""
}

for fname, clone_code in files.items():
    path = f'lib/ladder/models/{fname}'
    with open(path, 'r') as f:
        content = f.read()
    # strip the last closing brace
    content = content.rstrip()
    if content.endswith('}'):
        content = content[:-1]
    
    with open(path, 'w') as f:
        f.write(content + clone_code + '\n')
